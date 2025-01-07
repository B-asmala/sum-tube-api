const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const { YoutubeTranscript } = require('youtube-transcript');
//سأعطيك مضمون فيديو معين. قم بتلخيصه في نقاط ولا تضيع اي من التفاصيل المهمة. أضف اكبر عدد من التفاصيل المأخوذة من الفيديو. لا تستخدم غير اللغة العربية
dotenv.config({ path: './config.env' });

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
    try {
        const subtitlesArr = await YoutubeTranscript.fetchTranscript(req.params.id);
        for (const i of subtitlesArr) {
            subtitles += (i.text + ' ');
        }

        console.log(subtitles);
        res.status(200).json({
            success: true,
            data: subtitles
        });
        
        
        
    } catch (err) {
        console.log(err);
        res.send("Error");
    }
});


app.listen(3000, ()=> {
    console.log("server running");
})