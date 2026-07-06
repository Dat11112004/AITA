import crypto from 'crypto';

export class CloudinaryService {
  private static readonly cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  private static readonly apiKey = process.env.CLOUDINARY_API_KEY;
  private static readonly apiSecret = process.env.CLOUDINARY_API_SECRET;

  /**
   * Uploads an image from a public URL to Cloudinary using the REST API (no SDK required).
   * @param imageUrl Public URL of the image to upload
   * @returns The secure URL of the uploaded image, or null if failed
   */
  static async uploadImageFromUrl(imageUrl: string): Promise<string | null> {
    if (!this.cloudName || !this.apiKey || !this.apiSecret) {
      console.warn('Cloudinary config missing. Skipping avatar upload.');
      return null;
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      
      // Generate SHA-1 signature
      // The parameters to sign must be in alphabetical order. 
      // We only have timestamp for a basic URL upload.
      const stringToSign = `timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

      const formData = new URLSearchParams();
      formData.append('file', imageUrl);
      formData.append('api_key', this.apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Cloudinary API Error:', result.error?.message || result);
        return null;
      }

      return result.secure_url;
    } catch (error) {
      console.error('Failed to upload image to Cloudinary:', error);
      return null;
    }
  }
}
