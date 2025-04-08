# Forge – Your AI Learning Assistant

## The Problem:

Many students face overwhelming academic pressure while juggling massive amounts of information with limited time and support. Traditional study methods, such as reading textbooks, often fall short nowadays, and this leads to procrastination, burnout, and a lack of motivation. Poor time management and ineffective learning strategies also contribute to missed deadlines, low participation in group projects, and even failing grades. The root issue? Students don't just need more resources. They need smarter and reliable ones.

## Our Solution:

Forge is an AI-powered learning assistant that transforms the way students study. By combining automation with personalized learning tools, Forge helps students break down complex content into more concise and shorter pieces. Forge offers learners to create a study session, which allows them to focus on one topic and method of learning at a time. They have a study timer you can set to help you stay focused and retain information more effectively. From AI-generated memory aids and quizzes to real-time speech-to-text transcriptions, mindmaps, and summaries, Forge empowers students to take control of their learning. Forge provides you with all the tools needed to learn faster and more easily.

## How We Use AI:

With the use of OpenAI GPT-o4, students can upload their study material and have Forge generate a concise yet easy-to-understand summary of the material. It is able to identify key terms, generate mindmaps, simplify explanations, and create personalized quizzes to test the learner's knowledge.
AI is also used in our Speech-to-Text Note Taking feature. Forge turns spoken lectures or discussions into summarized notes using natural language processing, making it easier to review and understand key points. Furthermore, it is also used to help generate mindmaps and hierarchical bullet points.

## Key Features:

- Personalized study sessions with focus timers
- AI-generated quizzes tailored to your material
- AI-generated mindmaps and note-taking
- Real-time speech-to-text transcription and smart summaries
- Instant insights into knowledge gaps and progress

## Our Impact:

Forge empowers students to take control of their learning, making exam prep less stressful and more effective. It enables all learners with free access to high-quality study support. Our goal is to help learners boost their confidence, improve their ability to obtain and retain information, and perform better academically.

## Inspiration

Our inspiration came from our own personal struggles when it comes to learning and studying for exams, we rarely have tools that can help us and grow alongside us and that is why we have made forge, an AI study companion that doesn't feel bloated or complicated.

## How we Build It

We built it entirely using NextJS for frontend, and then we implemented the use of OpenAI's 4o api assistant as our agent. To accompany the agent we had given it a vector store database in weaviate to store messages and files for easy retrieval and we had also given a code interpreter to the agent for it to run and execute its own code for much more accurate responses. Our quizzes were developed using another agent whose job is to return json responses only consisting of the quiz questions and answers. Our mind map functionality leveraged the use of the Whisper tool from open ai and we had also passed it into 4o to generate the algorithm for our mind map.

## Challenges we ran into

We had a lot of trouble with implementing RAG and the mind map algorithm because we weren't sure how it worked at the beginning, but overall we managed to pull through and make something while not completely fully functional still works pretty well.

## Accomplishments that we're proud of

We are proud of the application that we have made and we are proud of our features as well, We believe that the people who choose to use forge will come out of it with a good outlook of what it can and will be able to do for them now and in the future.

## What we learned

We learned a lot about teamwork and how to work in a tense environment that demands innovation and creativity. We learned to have fun while under pressure and still managed to be productive. We hope that what we learn here can be applied to our future job prospects in the market.

## What's next for FORGE

Overall we had a blast developing FORGE but that doesn't mean it's the end of it. We plan to continue building upon FORGE whether its unfinished or incomplete features and planned features we want to implement or a design overhaul that we deem as necessary. Who knows what lies ahead for FORGE but we are hopeful that we are ready to tackle it every step of the way and thrive.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Important Note

**Vercel Function Invocation Limits**: When deploying on Vercel, please note that the Hobby plan has a 10-second limit on function invocations. If your functions exceed this limit, they will timeout and return a 504 error. This can affect features like file processing, AI responses, and other operations that take longer than 10 seconds to complete. Consider optimizing your code or upgrading to a higher plan if you need longer execution times.

For more information, see [Vercel's documentation on function limitations](https://vercel.com/docs/functions/limitations#max-duration).

## Deployment

**Vercel Link** : [https://forge-zeta.vercel.app/](https://forge-zeta.vercel.app/)
