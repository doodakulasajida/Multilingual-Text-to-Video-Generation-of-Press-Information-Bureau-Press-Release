# Batch_179_Text to Video of Various Press Released using AI
# 📰 Text-to-Video AI Tool for Government Press Notes (13 Languages)

##  Project Overview
This project aims to **automatically convert official government press releases** into engaging videos using **Artificial Intelligence**.  
It supports **English** and **13 Indian languages**, enabling citizens to access official announcements in their preferred language through video.

---

## Objectives
- **Automated Conversion**: Transform press note text into videos without manual editing.
- **Multilingual Support**: English + 13 Indian languages for inclusivity.
- **Accessibility**: Help people with limited literacy access information via audio-visual format.
- **Government Communication Enhancement**: Faster, wider, and more engaging dissemination of official news.

---

##  Features
- **Text Summarization**: Extract key points from lengthy press notes using NLP models like **T5** or **BART**.
- **Language Translation**: Use AI-based translation tools (e.g., IndicTrans, Google Translate API).
- **Text-to-Speech (TTS)**: Generate natural-sounding voice-overs for each language.
- **Video Generation**: Combine voice, text overlays, and relevant visuals into a ready-to-publish video.
- **Automation Pipeline**: Fetch press notes → Summarize → Translate → TTS → Generate Video.

---

## System Architecture
```mermaid
flowchart LR
A[Press Note Text] --> B[Text Summarization]
B --> C[Language Translation (13 Languages)]
C --> D[Text-to-Speech]
D --> E[Video Generator]
E --> F[Final Video Output]

