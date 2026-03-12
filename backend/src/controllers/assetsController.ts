import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure storage path
const getAssetsPath = () => {
    if (process.env.ASSETS_STORAGE_PATH) {
        return process.env.ASSETS_STORAGE_PATH;
    }
    // Default for development
    return path.join(process.cwd(), '../frontend/public/assets');
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const assetsPath = getAssetsPath();
        // Ensure directory exists
        if (!fs.existsSync(assetsPath)) {
            fs.mkdirSync(assetsPath, { recursive: true });
        }
        cb(null, assetsPath);
    },
    filename: (req, file, cb) => {
        // Keep original filename
        cb(null, file.originalname);
    }
});

// Filter for images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

export const uploadAsset = (req: Request, res: Response) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded or invalid file type' });
    }

    // Return the path relative to the server root that the frontend can use
    // The static middleware will serve 'assets' folder at '/assets' route.
    const webPath = `/assets/${req.file.filename}`;

    res.status(200).json({
        message: 'File uploaded successfully',
        filename: req.file.filename,
        path: webPath
    });
};

export const getAssets = (req: Request, res: Response) => {
    const assetsPath = getAssetsPath();

    if (!fs.existsSync(assetsPath)) {
        return res.status(200).json([]);
    }

    fs.readdir(assetsPath, (err, files) => {
        if (err) {
            console.error('Failed to list assets:', err);
            return res.status(500).json({ error: 'Failed to list assets' });
        }

        // Filter for images only just in case
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        });

        const assets = imageFiles.map(file => ({
            name: file,
            path: `/assets/${file}`,
            url: `/assets/${file}`
        }));

        res.status(200).json(assets);
    });
};

export const deleteAsset = (req: Request, res: Response) => {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
    }

    // Security check: prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(getAssetsPath(), safeFilename);

    if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Failed to delete asset:', err);
                return res.status(500).json({ error: 'Failed to delete asset' });
            }
            res.status(200).json({ message: 'Asset deleted successfully' });
        });
    } else {
        res.status(404).json({ error: 'Asset not found' });
    }
};
