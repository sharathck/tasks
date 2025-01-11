# write shell script to execute following commands sequentilly
# npm run build
# npm run deploy
# firebase deploy
#!/bin/bash

echo "Starting build process..."
npm run build

# Run the script, git add, commit and push the changes
echo "Running the script to add stage all changes..."
git add --all
echo "Running the script to commit changes..."
git commit -m "Deploying to Firebase"
echo "Running the script to push changes..."
git push -u origin main
echo "All done!"
