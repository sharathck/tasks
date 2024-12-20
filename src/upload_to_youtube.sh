#!/bin/bash
cd $HOME/Downloads
for file in *.mp4; do
    echo "$file"
        echo "Starting upload for: $file"
        cd $HOME/Generative-AI
        python3 upload_video.py --file="$HOME/Downloads/$file"
        echo "Finished uploading: $file"
        echo "----------------------------------------"
done
cd $HOME/Downloads
for f in *.txt; do
    if [ -f "$f" ]; then
        ts=$(date +"%Y-%m-%d-%H-%M-%S")
        mv "$f" "Old_YouTube/${f%.txt}_$ts.txt"
    fi
done

echo "Script is completed"