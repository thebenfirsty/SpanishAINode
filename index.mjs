import fs from 'fs';
//import fetch from 'node-fetch';
import express from 'express';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import OpenAI from "openai";
import path from "path";

const app = express();
const port = process.env.PORT || 8000;

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI;
const wisp = new OpenAI;
const speaker = new OpenAI;

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads'); // ensure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now());
    }
});

//const storage = multer.memoryStorage();
const upload = multer({storage: storage})

app.post('/upload', upload.single('audioFile'), async (req, res) => {
    if (req.file) {
        console.log(req.file);
        const inputFilePath = req.file.path;
        console.log(inputFilePath);
        const outputFilePath = `results/${Date.now()}_.wav`; // Generate output file path
        console.log(outputFilePath);
        try {
            // Perform the conversion
            await convertAudioToWav(inputFilePath, outputFilePath);
            // Here you can decide what to do with the converted file.
            const speech = await whisper(outputFilePath);
            console.log(speech);
            const response = await gpt(speech.text);

            // Cleanup: Optionally delete the original upload and/or the converted file if not needed
            fs.unlinkSync(inputFilePath); // Delete the original file
            const toSend = response.choices[0].message.content;
            console.log(toSend);
            await speak(toSend);
            fs.unlinkSync(outputFilePath);
            const speechFilePath = path.join(__dirname, 'speech.mp3');
            res.sendFile(speechFilePath);
        } catch (error) {
            res.status(500).send(`Error processing file: ${error.message}`);
        }
    } else {
        res.status(400).send('No file uploaded.');
    }
});

app.listen(port, () => console.log(`Listening on port ${port}`));

const convertAudioToWav = (inputFilePath, outputFilePath) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputFilePath)
            .output(outputFilePath)
            .audioCodec('pcm_s16le') // Set audio codec to PCM signed 16-bit little endian
            .audioChannels(1) // Set number of audio channels to 1 (mono)
            .audioFrequency(16000) // Set audio frequency to 16000 Hz
            .addOption('-y')
            .on('error', (err, stdout, stderr) => {
                console.error('Error during conversion:', err);
                console.log('FFmpeg stdout:\n', stdout);
                console.log('FFmpeg stderr:\n', stderr);
            })
            .on('end', () => {
                console.log('Conversion finished:', outputFilePath);
                resolve(outputFilePath);
            })
            .on('error', (err) => {
                console.error('Error during conversion:', err);
                fs.unlinkSync(inputFilePath);
                reject(err);
            })
            .run();
    });
};

async function gpt(input) {
    console.log("In2");
    return openai.chat.completions.create({
        messages: [
            {role: "system", content: "You are a server at a coffee shop taking orders behind the cash register."},
            {role: "system", content: "Your job is to help the user practice their spanish skills by ordering coffee, drinks or other food in spanish."},
            {role: "system", content: "Seek to ask follow up questions that will stretch the user's vocabulary."},
            {role: "system", content: "If the user makes a mistake and you understand what they intended to say, gently correct them."},
            {role: "system", content: "If the user makes a mistake and you don't understand what they intended, tell them you don't understand and ask them to repeat."},
            {role: "system", content: "Respond only in Spanish"},
            {role: "user", content: input},
        ],
        model: "gpt-3.5-turbo-0125",
    });
}

async function whisper(file) {
    console.log("In1");
    try {
        return await wisp.audio.transcriptions.create({
        file: fs.createReadStream(file),
        model: "whisper-1",
    })
    }
    catch (error) {
        console.log(error)
    }
}

async function speak(text){
    console.log("In3");
    const speechFile = path.resolve('./speech.mp3');
    const spoken = await speaker.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "mp3",
    });
    console.log(spoken);
    console.log(speechFile);
    const buffer = Buffer.from(await spoken.arrayBuffer());
    await fs.promises.writeFile(speechFile, buffer);
}
