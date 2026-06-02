FROM node:22-alpine                 
# Start with a lightweight Linux image that already has Node.js 22 installed
WORKDIR /app                        
# Create and move into the /app folder inside the container
RUN apk update && apk add --no-cache g++   
# Install the C++ compiler (g++) needed to compile user C++ code
COPY . .                            
# Copy all files from your backend project into the /app folder
RUN npm install                    
# Install all dependencies from package.json
EXPOSE 8000                         
# Document that this container uses port 8000
CMD ["node", "index.js"]            
# Start the Express server when the container runs