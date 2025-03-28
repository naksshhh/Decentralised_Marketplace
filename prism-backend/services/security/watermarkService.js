const crypto = require('crypto');
const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class WatermarkService {
    constructor() {
        this.GAMMA = 0.4;  // Fraction of tuples to be marked
        this.L = 2;        // Number of least significant bits available for marking
    }

    generatePrivateKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    F(value, privateKey) {
        const innerHash = crypto.createHash('sha256')
            .update(privateKey + value)
            .digest('hex');
        const outerHash = crypto.createHash('sha256')
            .update(privateKey + innerHash)
            .digest('hex');
        return parseInt(outerHash, 16);
    }

    mark(primaryKey, attributeValue, bitIndex, privateKey) {
        const firstHash = this.F(primaryKey, privateKey);
        const bitValue = firstHash % 2 === 0 ? 0 : 1;
        const mask = 1 << bitIndex;
        return (attributeValue & ~mask) | (bitValue << bitIndex);
    }

    async insertWatermark(inputFile, outputFile, privateKey, hasHeader = true, primaryKeyIndex = 0) {
        const database = [];
        const results = [];

        // Read the input file
        await new Promise((resolve, reject) => {
            fs.createReadStream(inputFile)
                .pipe(csv())
                .on('data', (data) => {
                    const row = Object.values(data);
                    try {
                        const primaryKey = row[primaryKeyIndex];
                        const attributes = row.map((val, idx) => 
                            idx === primaryKeyIndex ? val : parseInt(val)
                        );
                        database.push({ primaryKey, attributes });
                    } catch (error) {
                        console.error('Error processing row:', error);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        let markedCount = 0;
        const totalTuples = database.length;

        // Process each row
        for (const row of database) {
            if (this.F(row.primaryKey, privateKey) % Math.floor(1 / this.GAMMA) === 0) {
                const attrIndex = this.F(row.primaryKey, privateKey) % (row.attributes.length - 1);
                const bitIndex = this.F(row.primaryKey, privateKey) % this.L;
                row.attributes[attrIndex + 1] = this.mark(
                    row.primaryKey,
                    row.attributes[attrIndex + 1],
                    bitIndex,
                    privateKey
                );
                markedCount++;
            }
            results.push(row);
        }

        // Write the watermarked data
        const csvWriter = createCsvWriter({
            path: outputFile,
            header: Object.keys(database[0].attributes).map(id => ({ id, title: id }))
        });

        await csvWriter.writeRecords(results);

        return {
            markedCount,
            totalTuples,
            watermarkHash: crypto.createHash('sha256')
                .update(privateKey + JSON.stringify(results))
                .digest('hex')
        };
    }

    async detectWatermark(inputFile, privateKey, hasHeader = true, primaryKeyIndex = 0, threshold = 0.5) {
        const database = [];
        const results = [];

        // Read the input file
        await new Promise((resolve, reject) => {
            fs.createReadStream(inputFile)
                .pipe(csv())
                .on('data', (data) => {
                    const row = Object.values(data);
                    try {
                        const primaryKey = row[primaryKeyIndex];
                        const attributes = row.map((val, idx) => 
                            idx === primaryKeyIndex ? val : parseInt(val)
                        );
                        database.push({ primaryKey, attributes });
                    } catch (error) {
                        console.error('Error processing row:', error);
                    }
                })
                .on('end', resolve)
                .on('error', reject);
        });

        let totalMarked = 0;
        let matchingBits = 0;

        for (const row of database) {
            if (this.F(row.primaryKey, privateKey) % Math.floor(1 / this.GAMMA) === 0) {
                totalMarked++;
                const attrIndex = this.F(row.primaryKey, privateKey) % (row.attributes.length - 1);
                const bitIndex = this.F(row.primaryKey, privateKey) % this.L;
                const expectedBit = this.F(row.primaryKey, privateKey) % 2;
                const actualBit = (row.attributes[attrIndex + 1] >> bitIndex) & 1;
                
                if (actualBit === expectedBit) {
                    matchingBits++;
                }
            }
        }

        if (totalMarked === 0) {
            return {
                detected: false,
                matchRatio: 0,
                totalMarked: 0,
                matchingBits: 0
            };
        }

        const matchRatio = matchingBits / totalMarked;
        return {
            detected: matchRatio >= threshold,
            matchRatio,
            totalMarked,
            matchingBits
        };
    }
}

module.exports = new WatermarkService(); 