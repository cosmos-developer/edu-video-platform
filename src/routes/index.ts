import { Router } from 'express';
import userRoutes from './userRoutes';
import lessonRoutes from './lessonRoutes';
import authRoutes from './authRoutes';
import videoRoutes from './videoRoutes';
import milestoneRoutes from './milestoneRoutes';
import sessionRoutes from './sessionRoutes';
import aiRoutes from './aiRoutes';
import analyticsRoutes from './analyticsRoutes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Interactive Learning Platform API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/lessons', lessonRoutes);
router.use('/videos', videoRoutes);
router.use('/milestones', milestoneRoutes);
router.use('/sessions', sessionRoutes);
router.use('/ai', aiRoutes);
router.use('/analytics', analyticsRoutes);

export default router;