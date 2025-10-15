import { Schema, model, Document } from 'mongoose';

export interface ILookup extends Document {
  ip: string;
  verdict: 'PROXY/VPN' | 'ORIGINAL';
  score: number;
  confidence?: number;
  whois?: Record<string, any>;
  checks?: Array<{
    type: string;
    result: boolean;
    details?: string;
  }>;
  realTimeMetrics?: any;
  realTimeAnalysis?: any;
  traditionalResult?: any;
  userId?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lookupSchema = new Schema<ILookup>(
  {
    ip: { type: String, required: true, index: true },
    verdict: { type: String, required: true, enum: ['PROXY/VPN', 'ORIGINAL'] },
    score: { type: Number, required: true, min: 0, max: 100 },
    confidence: { type: Number, min: 0, max: 100 },
    whois: { type: Schema.Types.Mixed },
    checks: [
      {
        type: { type: String, required: true },
        result: { type: Boolean, required: true },
        details: String,
      },
    ],
    realTimeMetrics: { type: Schema.Types.Mixed },
    realTimeAnalysis: { type: Schema.Types.Mixed },
    traditionalResult: { type: Schema.Types.Mixed },
    userId: { type: String, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// Create compound index for efficient queries
lookupSchema.index({ userId: 1, timestamp: -1 });
lookupSchema.index({ verdict: 1, timestamp: -1 });

const Lookup = model<ILookup>('Lookup', lookupSchema);

export default Lookup;
