const express = require('express');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const { YoutubeTranscript } = require('youtube-transcript');
const marked = require('marked');
const { json } = require('express');

const systemMessage = {
    en : "I will provide you with a video's subtitles. summarize them into general points without missing any details.",
    ar : "سأعطيك مضمون فيديو معين. قم بتلخيصه في نقاط ولا تضيع اي من التفاصيل المهمة. أضف اكبر عدد من التفاصيل المأخوذة من الفيديو. لا تستخدم غير اللغة العربية"
}

//DONE:keep request within model limit : chuncked the transcript
//TODO:handle any language : ask the model to translate the system message first ? 
//TODO:stream to client

dotenv.config({ path: './config.env' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const app = express();

//handle CORS
const allowedOrigins = ['null', 'https://b-asmala.github.io/sum-tube']; //[local host, a client hosted on my github]

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    }
    next();
});



//this app is hosted on glitch - which puts projects to sleep as a default
//and wakes them when a request is sent -
//so this endpoint is for waking up the server
app.get('/wake', (req, res)=>{
    res.status(200).json({
        success: true,
        message : 'awake'
    });
});


//this endpoint is for summarizing video, id of video is provided as a parameter
app.get('/sum/:id', async (req, res)=>{
    const chunkLimit = 2000;
    let subtitles;
    let summed = "";
    let i = 0;



    try {
        const subtitlesArr = await YoutubeTranscript.fetchTranscript(req.params.id);

        //get language of subtitles
        const language = subtitlesArr[0].lang;

        //create string of subtitles
        for (const i of subtitlesArr) {
            subtitles += (i.text + ' ');
        }

        //split the words
        subtitles = subtitles.split(' ');

        //summarize the subtitles
        //if the video is too long, make subtitles into chunks of 2000 words.
        while(i <= subtitles.length){
            let chunk = subtitles.slice(i, i + chunkLimit).join(' ');
            //console.log(chunk);
            let summedChunk = await sumAI(chunk, language);
            

            // the LLM model response usually begins with an informative sentence about the response
            //we remove it if it is not the first chunk 
            if(i > 0){  
                let j = 0;
                for(; j < summedChunk.length; j ++){
                    if(summedChunk[j] == ':'){
                        break;
                    }
                }

                summedChunk = summedChunk.slice(j + 1);
            }

            summed += summedChunk;

            i += chunkLimit;
        }

        summed = marked.parse(summed);
        
        res.status(200).json({
            success: true,
            data: summed,
            language
        });
        
        
        
    } catch (err) {
        console.log(err);
        res.send("Error");
    }
});



async function sumAI(subtitles, language) {
    let summed = "";
    try {
        const chatCompletion = await groq.chat.completions.create({
            "messages": [
            {
                "role": "system",
                "content": systemMessage[language]
            },
            {
                "role": "user",
                "content": subtitles}
            ],
            "model": "gemma2-9b-it",
            "temperature": 0.8,
            "max_tokens": 4096,
            "top_p": 1,
            "stream": true,
            "stop": null
        });
    
        for await (const chunk of chatCompletion) {
            summed += (chunk.choices[0]?.delta?.content || '');  
        }
        
        return summed;
    } catch (error) {
        console.log(error);
        
    }  
}

app.listen(3000, ()=> {
    console.log("server running");
})
