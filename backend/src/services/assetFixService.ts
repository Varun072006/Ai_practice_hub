import pool from '../config/database';
import { getRows } from '../utils/mysqlHelper';
import fs from 'fs';
import path from 'path';

// Path to frontend public assets
const ASSETS_DIR = path.join(__dirname, '../../../frontend/public/assets');

interface AssetIssue {
    questionId: string;
    title: string;
    type: string; // 'Description' | 'Solution HTML' | 'Solution CSS' | 'Solution JS' | 'Output Format'
    currentValue: string;
    suggestedValue: string;
    assetName: string;
    exists: boolean;
}

interface FixResult {
    dryRun: boolean;
    issues: AssetIssue[];
    fixedCount: number;
}

/**
 * Scans or fixes assets for a specific course.
 */
export const fixCourseAssets = async (courseId: string, dryRun: boolean): Promise<FixResult> => {
    // 1. Get all questions for this course
    const query = `
    SELECT q.id, q.title, q.description, q.reference_solution, q.output_format, q.question_type, c.title as course_title
    FROM questions q
    JOIN levels l ON q.level_id = l.id
    JOIN courses c ON l.course_id = c.id
    WHERE l.course_id = ?
  `;
    const rows = await getRows(await pool.query(query, [courseId]));

    if (rows.length === 0) {
        return { dryRun, issues: [], fixedCount: 0 };
    }

    // Check course title restriction
    // User requested "HTML/CSS and JavaScript course only"
    const courseTitle = rows[0].course_title.toLowerCase();
    const isWebCourse = /html|css|javascript|js|web|frontend/i.test(courseTitle);

    if (!isWebCourse) {
        // You might want to throw an error or return empty with a warning.
        // For now, let's treat it as "no issues found" but maybe log/warn?
        // Or return a specific error issues?
        // Let's just return empty to comply with "only works in...".
        return { dryRun, issues: [], fixedCount: 0 };
    }

    const questions = rows;

    const issues: AssetIssue[] = [];
    let fixedCount = 0;

    for (const q of questions) {
        let modified = false;
        let newDescription = q.description;
        let newSolution = q.reference_solution;
        let newOutputFormat = q.output_format;

        // Collection of all valid assets found in the text fields during processing
        // We will use this to populate the Output Format later.
        const foundAssetsInText = new Set<string>();

        // Helper to process text
        const processText = (text: string, context: string): string => {
            if (!text) return text;

            // Escape regex helper
            const escapeRegExp = (string: string) => {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            };

            // Pattern for img src
            // Capture src="..." inside <img ...>
            // We use a regex dealing with quotes.
            return text.replace(/<img\s+[^>]*src\s*=\s*(["'])([^"']+)\1[^>]*>/gi, (match, quote, srcValue) => {
                // Skip external links
                if (srcValue.startsWith('http')) return match;

                // Check format. We prefer "/assets/..." (absolute)
                const isAbsolute = srcValue.startsWith('/assets/');
                const isRelative = srcValue.startsWith('assets/');

                // Determine the potential file path on disk
                let relativePath = srcValue;
                if (isAbsolute) relativePath = srcValue.replace(/^\/assets\//, '');
                else if (isRelative) relativePath = srcValue.replace(/^assets\//, '');
                else relativePath = path.basename(srcValue); // Just filename -> assume asset

                const candidatePathLocal = path.join(ASSETS_DIR, relativePath);
                const assetExists = fs.existsSync(candidatePathLocal);

                if (assetExists) {
                    const targetAsset = `/assets/${relativePath}`;

                    // Mark this as a valid asset found in the code
                    foundAssetsInText.add(targetAsset);

                    if (isAbsolute) {
                        // It exists and format is /assets/... (perfect)
                        return match;
                    } else {
                        // It exists but format is "assets/..." or "file.png". Standardize to "/assets/..."
                        if (dryRun) {
                            issues.push({
                                questionId: q.id,
                                title: q.title,
                                type: context,
                                currentValue: srcValue,
                                suggestedValue: targetAsset,
                                assetName: relativePath,
                                exists: true
                            });
                            return match; // Don't change in dry run
                        } else {
                            modified = true;
                            // Safely replace ONLY the src attribute part
                            const srcPattern = new RegExp(`(src\\s*=\\s*${quote})${escapeRegExp(srcValue)}(${quote})`, 'i');
                            return match.replace(srcPattern, `$1${targetAsset}$2`);
                        }
                    }
                } else {
                    // Asset not found.
                    if (dryRun) {
                        issues.push({
                            questionId: q.id,
                            title: q.title,
                            type: context,
                            currentValue: srcValue,
                            suggestedValue: "Asset file missing",
                            assetName: relativePath,
                            exists: false
                        });
                    }
                    return match;
                }
            });
        };

        // 1. Check Description
        newDescription = processText(q.description, 'Description');

        // 2. Check Solution
        if (q.reference_solution) {
            // Try parsing as JSON first (Web Questions)
            try {
                const parsed = JSON.parse(q.reference_solution);
                if (parsed && typeof parsed === 'object') {
                    let jsonModified = false;
                    if (parsed.html) {
                        const fixedHtml = processText(parsed.html, 'Solution HTML');
                        if (fixedHtml !== parsed.html) {
                            parsed.html = fixedHtml;
                            jsonModified = true;
                        }
                    }

                    if (jsonModified && !dryRun) {
                        newSolution = JSON.stringify(parsed);
                        modified = true;
                    }

                    // Also scan HTML if it didn't change but we need to find assets? 
                    // processText is called above, so foundAssetsInText is populated.
                } else {
                    // Not a web question object?
                    newSolution = processText(q.reference_solution, 'Correct Solution');
                    if (newSolution !== q.reference_solution && !dryRun) modified = true;
                }
            } catch (e) {
                // Raw string
                newSolution = processText(q.reference_solution, 'Correct Solution');
                if (newSolution !== q.reference_solution && !dryRun) modified = true;
            }
        }

        // 3. Process Output Format (Assets Config JSON)
        let currentAssets: any[] = [];
        try {
            if (q.output_format) {
                const parsed = JSON.parse(q.output_format);
                if (Array.isArray(parsed)) currentAssets = parsed;
            }
        } catch (e) {
            // Ignore parse error
        }

        // Track seen assets to avoid duplicates (keys: filename)
        const seenAssetNames = new Set(currentAssets.map((a: any) => a.name));
        let assetsModified = false;

        // a) Fix existing entries
        const newAssets = currentAssets.map((asset: any) => {
            if (!asset.name || !asset.path) return asset;

            const srcValue = asset.path;
            if (srcValue.startsWith('http')) return asset;

            const isAbsolute = srcValue.startsWith('/assets/');
            const relativePath = isAbsolute ? srcValue.replace(/^\/assets\//, '') : srcValue.replace(/^assets\//, '');

            // Standardize to /assets/
            const targetPath = `/assets/${path.basename(relativePath)}`;

            if (asset.path !== targetPath) {
                const candidatePathLocal = path.join(ASSETS_DIR, path.basename(relativePath));
                if (fs.existsSync(candidatePathLocal)) {
                    if (!dryRun) {
                        assetsModified = true;
                        return { ...asset, path: targetPath };
                    } else {
                        issues.push({
                            questionId: q.id,
                            title: q.title,
                            type: 'Asset Config',
                            currentValue: srcValue,
                            suggestedValue: targetPath,
                            assetName: path.basename(relativePath),
                            exists: true
                        });
                    }
                }
            }
            return asset;
        });

        // b) Add missing assets found in text
        foundAssetsInText.forEach(targetPath => {
            const filename = path.basename(targetPath);

            if (!seenAssetNames.has(filename)) {
                // It's a new asset! 
                const item = { name: filename, path: targetPath };

                if (dryRun) {
                    issues.push({
                        questionId: q.id,
                        title: q.title,
                        type: 'Missing Asset Config',
                        currentValue: "(missing)",
                        suggestedValue: `Add ${filename}`,
                        assetName: filename,
                        exists: true
                    });
                } else {
                    // Add to assets
                    newAssets.push(item);
                    seenAssetNames.add(filename);
                    assetsModified = true;
                }
            }
        });

        if (assetsModified && !dryRun) {
            newOutputFormat = JSON.stringify(newAssets);
            modified = true;
        }

        // 4. Commit changes
        if (modified && !dryRun) {
            const updateQuery = `
            UPDATE questions 
            SET description = ?, reference_solution = ?, output_format = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
            await pool.query(updateQuery, [newDescription, newSolution, newOutputFormat, q.id]);
            fixedCount++;
        }
    }

    return { dryRun, issues, fixedCount };
};
