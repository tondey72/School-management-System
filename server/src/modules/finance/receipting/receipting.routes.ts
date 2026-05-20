import { Router } from 'express';

const router = Router();

// Endpoint to create a receipt
router.post('/create', async (req, res) => {
  // Logic to create a receipt
  res.send('Receipt created');
});

// Endpoint to fetch receipts
router.get('/', async (req, res) => {
  // Logic to fetch receipts
  res.send('Receipts fetched');
});

export default router;