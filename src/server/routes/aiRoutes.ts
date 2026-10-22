import { Router, Request, Response } from 'express';
import { geminiSkincareService, SkincareAnalysisRequest } from '../services/geminiService';

export const aiRouter = Router();

// POST /api/ai/consult - Consult Skincare Doctor
aiRouter.post('/consult', async (req: Request, res: Response) => {
  try {
    const { messages, selectedProducts, skinType, skinConcern, language } = req.body as SkincareAnalysisRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Invalid request: "messages" array is required.'
      });
      return;
    }

    const result = await geminiSkincareService.consultSkincareDoctor({
      messages,
      selectedProducts,
      skinType,
      skinConcern,
      language
    });

    res.json({
      success: true,
      reply: result.reply,
      model: result.model
    });
  } catch (error: any) {
    console.error('AI Skincare Doctor error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process AI skincare consultation'
    });
  }
});

// POST /api/ai/analyze-routine - Quick multi-product routine builder
aiRouter.post('/analyze-routine', async (req: Request, res: Response) => {
  try {
    const { products, skinType, skinConcern, language } = req.body;

    const messages = [
      {
        role: 'user' as const,
        content: `অনুগ্রহ করে downর ${products?.length || 0} T সিরাম/প্Roডাক্টের বিস্তারিত বিশ্লেষণ ও AM/PM ব্যবহারবিধি দিন।`
      }
    ];

    const result = await geminiSkincareService.consultSkincareDoctor({
      messages,
      selectedProducts: products,
      skinType,
      skinConcern,
      language: language || 'bn'
    });

    res.json({
      success: true,
      analysis: result.reply,
      model: result.model
    });
  } catch (error: any) {
    console.error('AI Routine Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze skincare routine'
    });
  }
});
