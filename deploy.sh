#!/bin/bash

echo "Starting build process..."
npm run build

# Run the script, git add, commit and push the changes
echo "Running the script to add stage all changes..."
git add --all

echo "Running the script to commit changes..."
git commit -m "Deploying the latest build"

echo "Running the script to push changes..."
# Try using explicit remote reference and check for errors
git push origin main || {
  echo "Failed to push to main branch. Checking current branch..."
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
  echo "Current branch is: $CURRENT_BRANCH"
  
  if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Not on main branch. Attempting to push current branch..."
    git push origin $CURRENT_BRANCH
  else
    echo "On main branch but push failed. You may need to pull changes first."
    echo "Try: git pull origin main"
  fi
}


echo "Deployment process completed!"
