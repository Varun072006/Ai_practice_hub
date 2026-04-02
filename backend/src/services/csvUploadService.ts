import pool from '../config/database';
import { randomUUID } from 'crypto';
import { getRows } from '../utils/mysqlHelper';
import { createCodingQuestion, createMCQQuestion } from './questionService';
import logger from '../config/logger';
import { normalizeExecutionInput } from '../utils/inputNormalizer';

export interface CSVRow {
  [key: string]: string;
}

/**
 * Normalizes newline placeholders in CSV text to actual newline characters.
 * Supports both /n and //n formats.
 */
const normalizeNewlines = (text: string | null | undefined): string => {
  if (!text) return '';
  // Support //n, /n, and \n
  return text.toString()
    .replace(/\/\/n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\\n/g, '\n');
};

export const parseAndCreateQuestionsFromCSV = async (
  csvData: CSVRow[],
  levelId: string,
  questionType?: 'coding' | 'mcq' | 'htmlcss'
): Promise<{ success: number; errors: string[] }> => {
  let successCount = 0;
  const errors: string[] = [];

  logger.info(`[parseAndCreateQuestionsFromCSV] Starting processing. Rows: ${csvData.length}, levelId: ${levelId}`);

  // Validate level exists
  try {
    const levelCheck = await pool.query('SELECT id FROM levels WHERE id = ?', [levelId]);
    const levelRows = getRows(levelCheck);
    if (levelRows.length === 0) {
      logger.error(`[parseAndCreateQuestionsFromCSV] Level ${levelId} not found`);
      return { success: 0, errors: [`Level ${levelId} not found`] };
    }
    logger.info(`[parseAndCreateQuestionsFromCSV] Level ${levelId} validated`);
  } catch (levelError: any) {
    logger.error(`[parseAndCreateQuestionsFromCSV] Error checking level:`, levelError);
    return { success: 0, errors: [`Failed to validate level: ${levelError.message}`] };
  }

  // Determine question type
  const enforcedType = questionType || 'mcq';

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

    try {
      logger.info(`[parseAndCreateQuestionsFromCSV] Processing row ${rowNumber}. Type: ${enforcedType}, Keys: ${Object.keys(row).join(', ')}`);

      // Handle MCQ questions
      if (enforcedType === 'mcq') {
        // Expected headers for MCQ (case-insensitive, spaces converted to underscores by parser):
        // title, description, option1, option2, option3, option4, correct_option, difficulty
        const requiredHeadersPresent =
          row.title !== undefined &&
          row.description !== undefined &&
          row.option1 !== undefined &&
          row.option2 !== undefined &&
          row.option3 !== undefined &&
          row.option4 !== undefined &&
          row.correct_option !== undefined;

        if (!requiredHeadersPresent) {
          errors.push(
            `Row ${rowNumber}: Missing required columns. Expected headers: title, description, option1, option2, option3, option4, correct_option, difficulty.`
          );
          continue;
        }

        const title = normalizeNewlines(row.title).trim();
        const description = normalizeNewlines(row.description).trim();
        const opt1 = normalizeNewlines(row.option1).trim();
        const opt2 = normalizeNewlines(row.option2).trim();
        const opt3 = normalizeNewlines(row.option3).trim();
        const opt4 = normalizeNewlines(row.option4).trim();
        const correctOptionRaw = normalizeNewlines(row.correct_option).trim();
        const difficulty = row.difficulty?.toString().trim() || 'medium';

        // Validate required fields
        if (!title || !description) {
          errors.push(`Row ${rowNumber}: Missing title or description`);
          continue;
        }

        // Collect options (must have all four; ignore empty strings but require at least 2)
        const optionTexts = [opt1, opt2, opt3, opt4].filter(Boolean) as string[];
        if (optionTexts.length < 2) {
          errors.push(`Row ${rowNumber}: MCQ questions must have at least 2 options (option1-option4)`);
          continue;
        }

        if (!correctOptionRaw) {
          errors.push(`Row ${rowNumber}: correct_option is required and must match one of the options exactly (case-insensitive)`);
          continue;
        }

        // Validate difficulty - handle case-insensitive matching (e.g., "Easy" -> "easy")
        const validDifficulties = ['easy', 'medium', 'hard'];
        const normalizedDifficulty = difficulty.toLowerCase().trim();
        if (!validDifficulties.includes(normalizedDifficulty)) {
          errors.push(`Row ${rowNumber}: difficulty must be one of: easy, medium, hard. Got: "${difficulty}"`);
          continue;
        }

        // Match correct answer against options (case-insensitive, trimmed)
        const correctLower = correctOptionRaw.toLowerCase();
        const matchedIndex = optionTexts.findIndex(opt => opt.toLowerCase() === correctLower);
        if (matchedIndex === -1) {
          errors.push(`Row ${rowNumber}: correct_option "${correctOptionRaw}" does not match any option (option1-option4). It must exactly match one of the option texts.`);
          continue;
        }

        // Build options array with is_correct flag
        const options = optionTexts.map((opt, idx) => ({
          option_text: opt,
          is_correct: idx === matchedIndex,
        }));

        await createMCQQuestion({
          level_id: levelId,
          title,
          description,
          options,
          difficulty: normalizedDifficulty,
        });

        successCount++;
      }
      // Handle Coding questions
      else if (enforcedType === 'coding') {
        // Expected headers for Coding (case-insensitive, spaces converted to underscores by parser):
        // title, description, input_format, output_format, constraints, reference_solution, difficulty
        const requiredHeadersPresent =
          row.title !== undefined &&
          row.description !== undefined &&
          row.reference_solution !== undefined;

        if (!requiredHeadersPresent) {
          errors.push(
            `Row ${rowNumber}: Missing required columns. Expected headers: title, description, reference_solution, difficulty. Optional: input_format, output_format, constraints.`
          );
          continue;
        }

        const title = normalizeNewlines(row.title).trim();
        const description = normalizeNewlines(row.description).trim();
        const inputFormat = normalizeNewlines(row.input_format).trim() || null;
        const outputFormat = normalizeNewlines(row.output_format).trim() || null;
        const constraints = normalizeNewlines(row.constraints).trim() || null;
        const referenceSolution = normalizeNewlines(row.reference_solution).trim();
        const difficulty = row.difficulty?.toString().trim() || 'medium';

        // Validate required fields
        if (!title || !description || !referenceSolution) {
          errors.push(`Row ${rowNumber}: Missing title, description, or reference_solution`);
          continue;
        }

        // Validate difficulty
        const validDifficulties = ['easy', 'medium', 'hard'];
        const normalizedDifficulty = difficulty.toLowerCase();
        if (!validDifficulties.includes(normalizedDifficulty)) {
          errors.push(`Row ${rowNumber}: difficulty must be one of: easy, medium, hard. Got: "${difficulty}"`);
          continue;
        }

        // For coding questions, we need at least one test case
        // Test cases can be provided in columns with two possible formats:
        // Format 1: testcase1_input, testcase1_output, testcase1_hidden (no underscores)
        // Format 2: test_case_1_input, test_case_1_output, test_case_1_hidden (with underscores)
        const testCases: Array<{ input_data: string; expected_output: string; is_hidden: boolean }> = [];

        // Helper function to get test case value trying both naming formats
        const getTestCaseValue = (index: number, field: 'input' | 'output' | 'hidden'): string | undefined => {
          // Try format 1: testcase1_input (no underscores in "testcase")
          const format1 = `testcase${index}_${field}`;
          if (row[format1] !== undefined && row[format1] !== null && row[format1] !== '') {
            logger.debug(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Found test case ${index} ${field} using format1: ${format1}`);
            return row[format1]?.toString().trim();
          }
          // Try format 2: test_case_1_input (with underscores)
          const format2 = `test_case_${index}_${field}`;
          if (row[format2] !== undefined && row[format2] !== null && row[format2] !== '') {
            logger.debug(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Found test case ${index} ${field} using format2: ${format2}`);
            return row[format2]?.toString().trim();
          }
          return undefined;
        };

        // Log available column keys for debugging
        const allKeys = Object.keys(row);
        const testCaseKeys = allKeys.filter(key => key.includes('testcase') || key.includes('test_case'));
        if (testCaseKeys.length > 0) {
          logger.info(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Found test case related columns: ${testCaseKeys.join(', ')}`);
        }

        // Look for test case columns (try up to 20 test cases)
        let testCaseIndex = 1;
        let foundAnyTestCase = false;

        while (testCaseIndex <= 20) {
          const input = getTestCaseValue(testCaseIndex, 'input');
          const output = getTestCaseValue(testCaseIndex, 'output');

          // If we have both input and output, create a test case
          if (input !== undefined && output !== undefined && input !== '' && output !== '') {
            foundAnyTestCase = true;
            const hiddenStr = getTestCaseValue(testCaseIndex, 'hidden');
            // Check if hidden: true/1/"true"/"1", otherwise false
            const isHidden = hiddenStr !== undefined && (
              hiddenStr.toLowerCase() === 'true' ||
              hiddenStr === '1' ||
              hiddenStr.toLowerCase() === 'yes'
            );

            const normalizedInput = normalizeNewlines(input);
            const normalizedOutput = normalizeNewlines(output);

            logger.debug(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Test case ${testCaseIndex} - Original input: "${input}", Normalized: "${normalizedInput}"`);

            testCases.push({
              input_data: normalizedInput,
              expected_output: normalizedOutput,
              is_hidden: isHidden,
            });
          } else if (input === undefined && output === undefined) {
            // If neither format found for this index, stop looking
            // (unless we already found some test cases, in which case continue a bit more)
            if (foundAnyTestCase || testCaseIndex > 10) {
              break;
            }
          }

          testCaseIndex++;
        }

        // Log test case extraction for debugging
        logger.info(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Found ${testCases.length} test case(s)`);

        // If no test cases provided, create a default one
        if (testCases.length === 0) {
          logger.warn(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: No test cases found, creating default empty test case`);
          testCases.push({
            input_data: '',
            expected_output: '',
            is_hidden: false,
          });
        }

        await createCodingQuestion({
          level_id: levelId,
          title,
          description,
          input_format: inputFormat || undefined,
          output_format: outputFormat || undefined,
          constraints: constraints || undefined,
          reference_solution: referenceSolution,
          difficulty: normalizedDifficulty,
          test_cases: testCases,
        });

        successCount++;
      }
      // Handle HTML/CSS questions (special format for web development)
      else if (enforcedType === 'htmlcss') {
        // Expected headers for HTML/CSS (case-insensitive, spaces converted to underscores by parser):
        // description, instructions, tags, assets, expectedHtml, expectedCss, expectedJs
        // Note: column names are normalized to lowercase with underscores
        const hasDescription = row.description !== undefined;
        const hasExpectedHtml = row.expectedhtml !== undefined;

        if (!hasDescription) {
          errors.push(
            `Row ${rowNumber}: Missing required column 'description'. Expected headers: description, instructions, tags, assets, expectedHtml, expectedCss, expectedJs.`
          );
          continue;
        }

        const description = normalizeNewlines(row.description).trim();
        const instructions = normalizeNewlines(row.instructions).trim() || '';
        const tags = normalizeNewlines(row.tags).trim() || '';
        const assets = normalizeNewlines(row.assets).trim() || '';
        const expectedHtml = normalizeNewlines(row.expectedhtml).trim() || '';
        const expectedCss = normalizeNewlines(row.expectedcss).trim() || '';
        const expectedJs = normalizeNewlines(row.expectedjs).trim() || '';

        // Validate required content
        if (!description) {
          errors.push(`Row ${rowNumber}: Description is empty or missing`);
          continue;
        }

        // Create title from description (first 80 chars or first sentence)
        let title = description.substring(0, 80);
        const firstPeriod = description.indexOf('.');
        if (firstPeriod > 0 && firstPeriod < 100) {
          title = description.substring(0, firstPeriod);
        }
        if (title.length >= 80) {
          title = title.substring(0, 77) + '...';
        }

        // Build the reference_solution as JSON containing HTML, CSS, JS
        const solutionObject = {
          html: expectedHtml,
          css: expectedCss,
          js: expectedJs
        };
        const referenceSolution = JSON.stringify(solutionObject);

        // Create an empty test case (HTML/CSS questions don't use traditional test cases)
        const testCases = [{
          input_data: '',
          expected_output: '',
          is_hidden: false,
        }];

        // Log the HTML/CSS question creation
        logger.info(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber}: Creating HTML/CSS question with title: "${title}"`);

        await createCodingQuestion({
          level_id: levelId,
          title,
          description: instructions ? `${description}\n\n**Instructions:**\n${instructions}` : description,
          input_format: tags || undefined, // Store tags in input_format for categorization
          output_format: assets || undefined, // Store assets in output_format for future use
          constraints: undefined,
          reference_solution: referenceSolution,
          difficulty: 'medium', // Default difficulty for HTML/CSS questions
          test_cases: testCases,
        });

        successCount++;
      } else {
        errors.push(`Row ${rowNumber}: Unknown question type: ${enforcedType}. Must be 'mcq', 'coding', or 'htmlcss'.`);
        continue;
      }
    } catch (error: any) {
      logger.error(`[parseAndCreateQuestionsFromCSV] Error processing CSV row ${rowNumber}:`, error);
      logger.error(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber} error message:`, error.message);
      logger.error(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber} error stack:`, error.stack);
      logger.error(`[parseAndCreateQuestionsFromCSV] Row ${rowNumber} data:`, JSON.stringify(row, null, 2));
      errors.push(`Row ${rowNumber}: ${error.message || 'Unknown error'}`);
    }
  }

  logger.info(`[parseAndCreateQuestionsFromCSV] Processing complete. Success: ${successCount}, Errors: ${errors.length}`);
  return { success: successCount, errors };
};

