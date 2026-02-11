import express from 'express';
import { upload, uploadAsset, getAssets, deleteAsset } from '../controllers/assetsController';

const router = express.Router();

// Upload an asset
router.post('/upload', upload.single('file'), uploadAsset);

// Get all assets
router.get('/', getAssets);

// Delete an asset
router.delete('/:filename', deleteAsset);

export default router;
