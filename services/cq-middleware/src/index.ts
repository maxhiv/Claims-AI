// CQ Middleware Service - Address verification and data quality
// Provides address verification, standardization, and suggestions

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { getAddressProvider, initializeProviders } from './providers/index.js';
import type { 
  AddressVerificationRequest, 
  AddressSuggestionsRequest 
} from './providers/types.js';

const app = express();
const port = Number(process.env.PORT) || 6000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const providerStatus = await initializeProviders();
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'cq-middleware',
      version: '1.0.0',
      providers: Object.fromEntries(providerStatus),
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        dryRun: process.env.DRY_RUN === '1',
        defaultProvider: process.env.CQ_ADDRESS_PROVIDER || 'smarty'
      }
    };

    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Address verification endpoint
app.post('/verify-address', async (req, res) => {
  try {
    const request: AddressVerificationRequest = req.body;
    
    // Validate required fields
    if (!request.address) {
      return res.status(400).json({
        success: false,
        error: 'Address field is required'
      });
    }

    const provider = getAddressProvider();
    const result = await provider.verifyAddress(request);
    
    res.json(result);
  } catch (error) {
    console.error('Address verification error:', error);
    res.status(500).json({
      success: false,
      confidence: 0,
      deliverable: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Address suggestions endpoint
app.post('/suggest-addresses', async (req, res) => {
  try {
    const request: AddressSuggestionsRequest = req.body;
    
    // Validate required fields
    if (!request.query) {
      return res.status(400).json({
        success: false,
        suggestions: [],
        error: 'Query field is required'
      });
    }

    const provider = getAddressProvider();
    const result = await provider.getSuggestions(request);
    
    res.json(result);
  } catch (error) {
    console.error('Address suggestions error:', error);
    res.status(500).json({
      success: false,
      suggestions: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Batch address verification endpoint
app.post('/verify-addresses', async (req, res) => {
  try {
    const { addresses }: { addresses: AddressVerificationRequest[] } = req.body;
    
    if (!Array.isArray(addresses) || addresses.length === 0) {
      return res.status(400).json({
        success: false,
        results: [],
        error: 'Addresses array is required and must not be empty'
      });
    }

    if (addresses.length > 100) {
      return res.status(400).json({
        success: false,
        results: [],
        error: 'Maximum 100 addresses allowed per batch request'
      });
    }

    const provider = getAddressProvider();
    const results = await Promise.all(
      addresses.map(address => provider.verifyAddress(address))
    );
    
    res.json({
      success: true,
      results,
      totalProcessed: results.length,
      successfulVerifications: results.filter(r => r.success).length
    });
  } catch (error) {
    console.error('Batch address verification error:', error);
    res.status(500).json({
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Address quality check endpoint
app.post('/check-quality', async (req, res) => {
  try {
    const request: AddressVerificationRequest = req.body;
    
    if (!request.address) {
      return res.status(400).json({
        success: false,
        error: 'Address field is required'
      });
    }

    const provider = getAddressProvider();
    const verification = await provider.verifyAddress(request);
    
    // Calculate quality score
    let qualityScore = 0;
    if (verification.success) {
      qualityScore += 30; // Basic verification success
      qualityScore += verification.confidence * 40; // Confidence contribution
      if (verification.deliverable) qualityScore += 20; // Deliverable bonus
      if (verification.validation?.isValid) qualityScore += 10; // Validation bonus
    }
    
    res.json({
      success: verification.success,
      qualityScore: Math.round(qualityScore),
      grade: getQualityGrade(qualityScore),
      details: {
        deliverable: verification.deliverable,
        confidence: verification.confidence,
        validation: verification.validation
      },
      recommendations: getQualityRecommendations(verification, qualityScore)
    });
  } catch (error) {
    console.error('Address quality check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Provider status endpoint
app.get('/providers', async (req, res) => {
  try {
    const providerStatus = await initializeProviders();
    
    res.json({
      available: Array.from(providerStatus.keys()),
      status: Object.fromEntries(providerStatus),
      default: process.env.CQ_ADDRESS_PROVIDER || 'smarty',
      dryRun: process.env.DRY_RUN === '1'
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Utility functions
function getQualityGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getQualityRecommendations(verification: any, score: number): string[] {
  const recommendations: string[] = [];
  
  if (score < 70) {
    recommendations.push('Address may need manual review');
  }
  
  if (!verification.deliverable) {
    recommendations.push('Address may not be deliverable - verify with recipient');
  }
  
  if (verification.confidence < 0.8) {
    recommendations.push('Low confidence - consider requesting address clarification');
  }
  
  if (!verification.validation?.isPostalCode) {
    recommendations.push('Postal code may be missing or invalid');
  }
  
  return recommendations;
}

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🏠 CQ Middleware Service running on port ${port}`);
  console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 DRY_RUN: ${process.env.DRY_RUN === '1' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🏷️  Default Provider: ${process.env.CQ_ADDRESS_PROVIDER || 'smarty'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health              - Service health check');
  console.log('  POST /verify-address      - Verify single address');
  console.log('  POST /suggest-addresses   - Get address suggestions');
  console.log('  POST /verify-addresses    - Batch verify addresses');
  console.log('  POST /check-quality       - Check address quality');
  console.log('  GET  /providers           - List available providers');
});