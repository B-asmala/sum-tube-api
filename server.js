const express = require('express');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const { YoutubeTranscript } = require('youtube-transcript');
const marked = require('marked');



//سأعطيك مضمون فيديو معين. قم بتلخيصه في نقاط ولا تضيع اي من التفاصيل المهمة. أضف اكبر عدد من التفاصيل المأخوذة من الفيديو. لا تستخدم غير اللغة العربية
dotenv.config({ path: './config.env' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();


//this app is hosted on glitch which puts projects to sleep as a default
//wakes them when a request is sent 
//so this endpoint is for waking up the server
app.get('/wake', (req, res)=>{
    res.status(200).json({
        success: true,
        message : 'awake'
    });
});


//this endpoint is for summarizing video, id of video is provided as a parameter
app.get('/sum/:id', async (req, res)=>{
    let subtitles;
    let summed;
    try {
        const subtitlesArr = await YoutubeTranscript.fetchTranscript(req.params.id);
        for (const i of subtitlesArr) {
            subtitles += (i.text + ' ');
        }

        //summarize the subtitles
        summed = await sumAI(subtitles);

        //using marked to convert form md to html
        summed = marked.parse(summed);
        res.status(200).json({
            success: true,
            data: summed
        });
        
        
        
    } catch (err) {
        console.log(err);
        res.send("Error");
    }
});


app.listen(3000, ()=> {
    console.log("server running");
})


async function sumAI(subtitles) {
    const now = Date.now();
    let summed = "";
    const chatCompletion = await groq.chat.completions.create({
        "messages": [
        {
            "role": "system",
            "content": "I will provide you with a video's subtitles. summarize them into general points without missing any details. "
        },
        {
            "role": "user",
            "content": subtitles}
        ],
        "model": "gemma2-9b-it",
        "temperature": 1,
        "max_tokens": 1024,
        "top_p": 1,
        "stream": true,
        "stop": null
    });

    for await (const chunk of chatCompletion) {
        //process.stdout.write(chunk.choices[0]?.delta?.content || '');
        summed += (chunk.choices[0]?.delta?.content || '');
    }
    console.log("time:");
    console.log(Date.now() - now);
    return summed;
    
}
