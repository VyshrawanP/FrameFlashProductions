const cloudinary = require("cloudinary").v2;
const Busboy = require("busboy").default || require("busboy");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    })
  };
};

exports.handler = async (event) => {
  return new Promise((resolve, reject) => {
    if (event.httpMethod !== "POST") {
      resolve({
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" })
      });
      return;
    }

    const bb = Busboy({ headers: event.headers });
    const fields = {};
    let uploadPromise;

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("file", (_name, file) => {
      uploadPromise = new Promise((res, rej) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "movies" },
          (err, result) => {
            if (err) rej(err);
            else res(result);
          }
        );
        file.pipe(stream);
      });
    });

    bb.on("finish", async () => {
      try {
        const result = await uploadPromise;

        resolve({
          statusCode: 200,
          body: JSON.stringify({
            image: result.secure_url,
            ...fields
          })
        });
      } catch (err) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: err.message })
        });
      }
    });

    bb.end(Buffer.from(event.body, "base64"));
  });
};
