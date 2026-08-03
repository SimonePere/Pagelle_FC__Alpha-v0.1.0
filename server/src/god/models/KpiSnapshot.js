const mongoose = require('mongoose');

const kpiSnapshotSchema = new mongoose.Schema({
    bucketType: {
        type: String,
        enum: ['hourly', 'daily'],
        required: true,
        index: true
    },
    bucketStart: {
        type: Date,
        required: true,
        index: true
    },
    bucketEnd: {
        type: Date,
        required: true
    },
    rangeKey: {
        type: String,
        enum: ['7d', '30d', '90d', 'total', 'custom'],
        required: true,
        index: true
    },
    metrics: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
}, { timestamps: true });

kpiSnapshotSchema.index({ bucketType: 1, bucketStart: -1, rangeKey: 1 }, { unique: true });

module.exports = mongoose.model('KpiSnapshot', kpiSnapshotSchema);
