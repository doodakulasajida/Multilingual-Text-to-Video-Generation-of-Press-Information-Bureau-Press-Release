
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import React, { useState, useEffect, useTransition, useRef } from 'react';
import { Bot, Clapperboard, Download, Languages, Loader2, Mic, Pilcrow, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { generateVideo } from "@/ai/flows/generate-video-flow";
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarFooter, SidebarTitle, SidebarDescription } from "@/components/ui/sidebar-beautified";

const formSchema = z.object({
  script: z.string().min(10, "Please enter a script of at least 10 characters.").max(4000, "Script must be 4000 characters or less."),
  narration: z.string().optional(),
  style: z.string(),
  language: z.enum(['en', 'hi', 'te']),
});

const styles = [
    { "id": "style-1", "name": "Cinematic", "description": "A dramatic, moody, and realistic cinematic style." },
    { "id": "style-2", "name": "Anime", "description": "A vibrant and colorful anime art style." },
    { "id": "style-3", "name": "Watercolor", "description": "A soft, blended, and artistic watercolor style." },
    { "id": "style-4", "name": "3D Render", "description": "A clean, polished, and modern 3D render style." },
    { "id": "style-5", "name": "Fantasy", "description": "An epic and magical fantasy art style." },
    { "id": "style-6", "name": "Vintage Film", "description": "A retro, grainy, and nostalgic vintage film style." }
];

export default function VideoGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      script: 'People Celebrating the launch of Swach Bharat Mission. Segregating waste and cleaning the streets in India',
      narration: 'People celebrating the launch of Swachh Bharat Mission. Segregating waste and cleaning the streets in India.',
      style: styles[0].name,
      language: 'en',
    },
  });

  useEffect(() => {
    if (isGenerating) {
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 1;
        });
      }, 1000); 

      return () => clearInterval(progressInterval);
    }
  }, [isGenerating]);
  
  const syncPlay = () => audioRef.current && videoRef.current && (audioRef.current.currentTime = videoRef.current.currentTime, audioRef.current.play());
  const syncPause = () => audioRef.current?.pause();
  const syncSeek = () => audioRef.current && videoRef.current && (audioRef.current.currentTime = videoRef.current.currentTime);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener('play', syncPlay);
      video.addEventListener('pause', syncPause);
      video.addEventListener('seeking', syncSeek);
      return () => {
        video.removeEventListener('play', syncPlay);
        video.removeEventListener('pause', syncPause);
        video.removeEventListener('seeking', syncSeek);
      };
    }
  }, [generatedVideoUrl, generatedAudioUrl]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { script, narration, style, language } = values;
    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedVideoUrl(null);
    setGeneratedAudioUrl(null);

    startTransition(async () => {
        try {
            const result = await generateVideo({
                prompt: script,
                narration: narration,
                style: style,
                aspectRatio: '16:9',
                language: language,
            });
            
            if (result.videoUrl) {
                setGenerationProgress(100);
                setGeneratedVideoUrl(result.videoUrl);
                setGeneratedAudioUrl(result.audioUrl || null);
            } else {
                 throw new Error("Video generation failed to return a URL.");
            }
        } catch (error: any) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error.message || "Something went wrong while generating the video. Please check the console and try again.",
            });
        } finally {
            setIsGenerating(false);
        }
    });
  }
  
  const handleLanguageChange = (language: 'en' | 'hi' | 'te') => {
    form.setValue('language', language);
    switch (language) {
      case 'hi':
        form.setValue('narration', 'स्वच्छ भारत मिशन की शुरूआत का जश्न मनाते लोग। भारत में कचरे को अलग करना और सड़कों की सफाई करना।');
        break;
      case 'te':
        form.setValue('narration', 'స్వచ్ఛ భారత్ మిషన్ ప్రారంభోత్సవాన్ని ప్రజలు జరుపుకుంటున్నారు. భారతదేశంలో వ్యర్థాలను వేరు చేయడం మరియు వీధులను శుభ్రపరచడం.');
        break;
      default:
        form.setValue('narration', 'People celebrating the launch of Swachh Bharat Mission. Segregating waste and cleaning the streets in India.');
        break;
    }
  };


  return (
    <>
      <Sidebar>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
            <SidebarHeader>
                <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    <SidebarTitle>AI Video Generator</SidebarTitle>
                </div>
                <SidebarDescription>
                    Create stunning videos from text prompts with AI-powered narration.
                </SidebarDescription>
            </SidebarHeader>
            <SidebarContent className="p-4 flex-grow">
              <div className="flex flex-col gap-6">
                <FormField
                  control={form.control}
                  name="script"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Pilcrow/>Video Prompt</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., A cinematic shot of a sunset over mountains."
                          className="min-h-[120px] resize-none bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="narration"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="flex items-center gap-2"><Mic/>Narration Script (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the exact text you want to hear in the video..."
                          className="min-h-[120px] resize-none bg-background/50"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="style"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Sparkles/>Visual Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isGenerating}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select a style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {styles.map((style) => (
                            <SelectItem key={style.id} value={style.name}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Languages/>Narration Language</FormLabel>
                      <Select 
                        onValueChange={(value: 'en' | 'hi' | 'te') => handleLanguageChange(value)} 
                        defaultValue={field.value} 
                        disabled={isGenerating}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Select a language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">Hindi</SelectItem>
                          <SelectItem value="te">Telugu</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </SidebarContent>
            <SidebarFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isGenerating || isPending}>
                {isGenerating || isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="mr-2 h-4 w-4" /> Generate Video</>}
              </Button>
            </SidebarFooter>
          </form>
        </Form>
      </Sidebar>
      <SidebarInset>
        <div className="w-full h-full flex flex-col items-center justify-center p-4 md:p-8">
            {isGenerating ? (
                <div className="w-full max-w-md text-center">
                     <p className="mb-4 text-xl font-medium">Brewing your masterpiece...</p>
                     <p className="mb-4 text-sm text-muted-foreground">This can take a minute or two. Please be patient.</p>
                    <Progress value={generationProgress} className="w-full" />
                </div>
            ) : generatedVideoUrl ? (
                <div className="w-full h-full max-w-4xl space-y-6 flex flex-col justify-center">
                     <div>
                        <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
                            <video ref={videoRef} src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                        </div>
                        <div className="mt-4">
                             <a href={generatedVideoUrl} download="generated-video.mp4">
                                <Button><Download className="mr-2"/>Download Video</Button>
                             </a>
                        </div>
                    </div>

                    {generatedAudioUrl && (
                        <>
                            <audio ref={audioRef} src={generatedAudioUrl} className="hidden" />
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Audio Narration</h3>
                                <div className="mt-2">
                                   <a href={generatedAudioUrl} download="generated-audio.wav">
                                      <Button variant="secondary"><Download className="mr-2"/>Download Audio</Button>
                                   </a>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="text-center text-muted-foreground">
                    <div className="p-8 bg-card rounded-full mb-4 inline-block border-2 border-dashed border-muted-foreground/30">
                        <Clapperboard className="mx-auto h-16 w-16 text-muted-foreground/50"/>
                    </div>
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">Your Video Awaits</h2>
                    <p>Fill out the form on the left and click "Generate Video" to begin.</p>
                </div>
            )}
        </div>
      </SidebarInset>
    </>
  );
}
