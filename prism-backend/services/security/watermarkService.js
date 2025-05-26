const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const unzipper = require('unzipper');
const XLSX = require('xlsx');
const mm = require('music-metadata');
const ffmpeg = require('fluent-ffmpeg');

class WatermarkService {
    constructor() {
        this.GAMMA = 0.4;  // Fraction of tuples to be marked
        this.L = 2;        // Number of least significant bits available for marking
    }

    F(value, secret) {
        const innerHash = crypto.createHash('sha256')
            .update(secret + value)
            .digest('hex');
        const outerHash = crypto.createHash('sha256')
            .update(secret + innerHash)
            .digest('hex');
        return parseInt(outerHash, 16);
    }

    mark(primaryKey, attributeValue, bitIndex, secret) {
        const firstHash = this.F(primaryKey, secret);
        const bitValue = firstHash % 2 === 0 ? 0 : 1;
        const mask = 1 << bitIndex;
        return (attributeValue & ~mask) | (bitValue << bitIndex);
    }

    applyWatermarkToMetadata(metadata, secret) {
        const keys = Object.keys(metadata);
        let markedCount = 0;
        keys.forEach((key) => {
          if (typeof metadata[key] === 'number' && this.F(key,secret) % Math.floor(1 / this.GAMMA) === 0) {
            const bitIndex = this.F(key, secret) % this.L;
            metadata[key] = this.mark(key, metadata[key], bitIndex, secret);
            markedCount++;
          }
        });
        return markedCount;
      }
//specific for csv
    /*async insertWatermark(inputFile, outputFile, secret, hasHeader = true, primaryKeyIndex = 0) {
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
            if (this.F(row.primaryKey, secret) % Math.floor(1 / this.GAMMA) === 0) {
                const attrIndex = this.F(row.primaryKey, secret) % (row.attributes.length - 1);
                const bitIndex = this.F(row.primaryKey, secret) % this.L;
                row.attributes[attrIndex + 1] = this.mark(
                    row.primaryKey,
                    row.attributes[attrIndex + 1],
                    bitIndex,
                    secret
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
                .update(secret + JSON.stringify(results))
                .digest('hex')
        };
    }*/

    async extractMetadata(file) {
        const buffer = file.buffer;
        const mime = file.mimetype;
        const meta = {
          originalFilename: file.originalname,
          fileSize: file.size,
          mimeType: mime,
          uploadDate: new Date().toISOString()
        };
    
        try {
          if (mime.startsWith('image/')) {
            const img = await sharp(buffer).metadata();
            Object.assign(meta, {
              width: img.width,
              height: img.height,
              format: img.format,
              hasAlpha: img.hasAlpha,
              channels: img.channels,
              space: img.space
            });
          } else if (mime === 'application/pdf') {
            const data = await pdfParse(buffer);
            Object.assign(meta, {
              pageCount: data.numpages,
              textLength: data.text.length,
              hasText: data.text.length > 0
            });
          } else if (mime.includes('spreadsheet') || mime.includes('excel')) {
            const wb = XLSX.read(buffer, { type: 'buffer' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            Object.assign(meta, {
              sheetNames: wb.SheetNames,
              firstSheetRange: sheet['!ref'],
              rowCount: XLSX.utils.decode_range(sheet['!ref']).e.r + 1
            });
          } else if (mime.includes('zip')) {
            const zip = await unzipper.Open.buffer(buffer);
            Object.assign(meta, {
              zipEntries: zip.files.length,
              totalSize: zip.files.reduce((acc, file) => acc + file.uncompressedSize, 0)
            });
          } else if (mime.startsWith('audio/')) {
            const audioData = await mm.parseBuffer(buffer);
            Object.assign(meta, {
              audioFormat: mime.split('/')[1],
              duration: audioData.format.duration,
              bitrate: audioData.format.bitrate,
              sampleRate: audioData.format.sampleRate
            });
          } else if (mime.startsWith('video/')) {
            const videoMetadata = await new Promise((resolve, reject) => {
              ffmpeg.ffprobe(buffer, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata);
              });
            });
            Object.assign(meta, {
              videoFormat: mime.split('/')[1],
              duration: videoMetadata.format.duration,
              size: videoMetadata.format.size,
              bitrate: videoMetadata.format.bit_rate
            });
          } else if (mime === 'application/json') {
            const text = buffer.toString('utf8');
            try {
              const jsonData = JSON.parse(text);
              Object.assign(meta, {
                jsonType: typeof jsonData,
                isArray: Array.isArray(jsonData),
                jsonKeys: Object.keys(jsonData),
                jsonSize: JSON.stringify(jsonData).length
              });
            } catch (err) {
              console.warn("Failed to parse JSON", err);
            }
          } else if (mime === 'text/csv') {
            const text = buffer.toString('utf8');
            const lines = text.split('\n');
            Object.assign(meta, {
              csvHeaders: lines[0]?.split(',').map(h => h.trim()),
              rowCount: lines.length - 1
            });
          }
        } catch (err) {
          console.warn("Metadata extraction error:", err);
        }
    
        return meta;
      }
    

    async detectWatermark(metadata, secret, threshold = 0.5) {
        const keys = Object.keys(metadata);
    let totalMarked = 0;
    let matchingBits = 0;

    keys.forEach((key) => {
      const value = metadata[key];
      if (typeof value === 'number' && this.F(key, secret) % Math.floor(1 / this.GAMMA) === 0) {
        totalMarked++;
        const bitIndex = this.F(key, secret) % this.L;
        const expectedBit = this.F(key, secret) % 2;
        const actualBit = (value >> bitIndex) & 1;
        if (actualBit === expectedBit) {
          matchingBits++;
        }
      }
    });

    const matchRatio = totalMarked > 0 ? matchingBits / totalMarked : 0;
    return {
      detected: matchRatio >= threshold,
      matchRatio,
      totalMarked,
      matchingBits
    };
    }

    async processAndWatermarkFile(file, publicKey, watermarkInfo) {
        const secretSource = watermarkInfo || publicKey;
        const secret = crypto.createHash('sha256').update(secretSource).digest('hex');
        const baseMetadata = await this.extractMetadata(file);
        const fullMetadata = { ...baseMetadata, watermarkInfo: secretSource };
    
        const markedCount = this.applyWatermarkToMetadata(fullMetadata, secret);
        const watermarkHash = crypto.createHash('sha256').update(secret).digest('hex');

        return {
          metadataObject: {
            ...fullMetadata,
            watermarkHash,
            markedCount
          },
        };
      }

//specific to image files
    /* async function watermarkImage(filePath, ownerInfo) {
      try {
        const image = await Jimp.read(filePath);
        
        // Create a new image for the watermark text
        const watermark = new Jimp(image.getWidth(), image.getHeight());
        
        // Load font
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        
        // Add timestamp to owner info
        const watermarkText = `${ownerInfo} | ${new Date().toISOString()}`;
        
        // Place watermark text on the image
        watermark.print(
          font,
          10,
          image.getHeight() - 30,
          {
            text: watermarkText,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
            alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
          },
          image.getWidth() - 20
        );
        
        // Make the watermark semi-transparent
        watermark.opacity(0.5);
        
        // Composite the watermark onto the original image
        image.composite(watermark, 0, 0, {
          mode: Jimp.BLEND_SOURCE_OVER,
          opacitySource: 0.5,
          opacityDest: 1
        });
        
        // Save the watermarked image
        const watermarkedFilePath = filePath.replace(/\.\w+$/, '_watermarked$&');
        await image.writeAsync(watermarkedFilePath);
        
        return watermarkedFilePath;
      } catch (error) {
        console.error('Error applying watermark:', error);
        throw new Error('Failed to apply watermark to image: ' + error.message);
      }
    }*/
}

module.exports = new WatermarkService(); 