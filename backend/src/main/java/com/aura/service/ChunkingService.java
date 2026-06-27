package com.aura.service;

import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChunkingService {

    public List<String> overlappingChunk(String text, int size, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text == null || text.trim().isEmpty()) {
            return chunks;
        }

        // Sentence splitting regex
        Pattern pattern = Pattern.compile("[^.!?]+[.!?]+(\\s|$)");
        Matcher matcher = pattern.matcher(text);
        List<String> sentences = new ArrayList<>();
        while (matcher.find()) {
            sentences.add(matcher.group().trim());
        }

        if (sentences.isEmpty()) {
            sentences.add(text.trim());
        }

        List<String> currentChunk = new ArrayList<>();
        int currentLength = 0;

        for (String sentence : sentences) {
            int wordsCount = countWords(sentence);
            if (currentLength + wordsCount > size) {
                if (!currentChunk.isEmpty()) {
                    chunks.add(String.join(" ", currentChunk));
                }

                // Gather overlapping sentences
                List<String> overlapSentences = new ArrayList<>();
                int overlapCount = 0;
                for (int i = currentChunk.size() - 1; i >= 0; i--) {
                    String s = currentChunk.get(i);
                    int sWords = countWords(s);
                    if (overlapCount + sWords <= overlap) {
                        overlapSentences.add(0, s);
                        overlapCount += sWords;
                    } else {
                        break;
                    }
                }

                currentChunk = new ArrayList<>(overlapSentences);
                currentChunk.add(sentence);
                currentLength = overlapCount + wordsCount;
            } else {
                currentChunk.add(sentence);
                currentLength += wordsCount;
            }
        }

        if (!currentChunk.isEmpty()) {
            chunks.add(String.join(" ", currentChunk));
        }

        return chunks;
    }

    private int countWords(String s) {
        if (s == null || s.trim().isEmpty()) return 0;
        return s.trim().split("\\s+").length;
    }
}
