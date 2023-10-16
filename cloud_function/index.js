const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');

const secretClient = new SecretManagerServiceClient();
const storage = new Storage();

exports.getDataAndSaveToGCS = async (event, context) => {
    const [version] = await secretClient.accessSecretVersion({
        name: 'projects/notification-app-402119/secrets/JCDecauxAPIKey/versions/latest',
    });
    const apiKey = version.payload.data.toString();
    console.log("api key", version.payload.data.toString())

    const response = await fetch(`https://api.jcdecaux.com/vls/v1/stations?apiKey=${apiKey}&contract=amiens`);
    const data = await response.json();

    const bucketName = 'stationsinfo_velib';
    let bucket = storage.bucket(bucketName);

    if (!(await bucket.exists())[0]) {
        await storage.createBucket(bucketName, { location: 'europe-west9' });
    }

    const filename = `data-${new Date().toISOString()}.json`;
    const file = bucket.file(filename);

    await file.save(JSON.stringify(data));

    console.log(`Saved data to ${filename} in bucket ${bucketName}`);
};
