echo "Starting YouTube Video and Short Generation"
cd $HOME/Downloads
mkdir -p Old_YouTube Archive
forbidden_files=$(find . -maxdepth 1 -type f \( -name "*.avif" -o -name "*.bmp" -o -name "*.ico" -o -name "*.jp2" -o -name "*.j2k" -o -name "*.jpf" -o -name "*.jpx" -o -name "*.jpm" -o -name "*.mj2" -o -name "*.svg" -o -name "*.svgz" -o -name "*.tiff" -o -name "*.xpm" \))
if [ -n "$forbidden_files" ]; then
    echo "Error: Found image files with invlid file extension, Please Remove these files and try again:"
    echo "$forbidden_files"
    exit 1
fi
echo "Moving Existing Video Files to Old_YouTube"
mv *.mp4 Old_YouTube/
echo "Moving Existing Files in Downloads Folder to Archive"
find . -maxdepth 1 -type f ! \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.txt" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.mp3" -o -iname "*.sh" \) -exec mv {} Archive/ \;
cd $HOME/Generative-AI
echo "Running YouTube Video and Short Generation"
python3 $HOME/Generative-AI/YouTube_Video_Short.py
echo "Moving Log File to Old_YouTube Folder"
mv $HOME/Downloads/log_* $HOME/Downloads/Old_YouTube/
echo "YouTube Video and Short Generation Completed"
