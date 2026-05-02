const LinkTransformer = require('./src/utils/LinkTransformer');

async function test() {
    const rawUrl = "https://www.amazon.com/dp/B08N5WRWJ5?tag=external-20&other=param";
    const cleaned = await LinkTransformer.transform(rawUrl);
    console.log("Original:", rawUrl);
    console.log("Cleaned :", cleaned);

    if (cleaned.includes("tag=masbaratodeal-20") && !cleaned.includes("tag=external-20")) {
        console.log("✅ Link Transformation: SUCCESS");
    } else {
        console.log("❌ Link Transformation: FAILED");
    }
}

test();
