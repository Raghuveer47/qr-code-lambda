
require("dotenv").config();


const QRCode = require("qrcode");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Use the Lambda execution role for AWS authentication.
// Change the region if your S3 bucket is in another region.
const s3 = new S3Client({
  region: "us-east-1"
});

exports.handler = async (event) => {
  try {
    const body =
      typeof event.body === "string"
        ? JSON.parse(event.body)
        : event.body || {};

    const url = body.url;
    const bucket = process.env.BUCKET_NAME;

    if (!url || typeof url !== "string" || url.length > 2048) {
      return response(400, {
        message: "Please provide a URL (maximum 2048 characters)"
      });
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(url);
    } catch {
      return response(400, { message: "Invalid URL" });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return response(400, {
        message: "Only HTTP and HTTPS URLs are allowed"
      });
    }

    if (!bucket) {
      throw new Error("BUCKET_NAME is missing");
    }

    const imageBuffer = await QRCode.toBuffer(url, {
      type: "png",
      width: 300,
      margin: 2
    });

    const key = `qr-codes/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`;

    // Upload QR code to S3
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: imageBuffer,
      ContentType: "image/png"
    }));

    // Create a temporary URL for the private image
    const imageUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      }),
      { expiresIn: 3600 }
    );

    return response(200, {
      message: "QR code generated successfully",
      key,
      imageUrl
    });
  } catch (error) {
    console.error("QR generation error:", error);

    return response(500, {
      message: "Failed to generate QR code. Check server logs."
    });
  }
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  };
}
