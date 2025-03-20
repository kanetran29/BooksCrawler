import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function cloneHTML(url: string): Promise<string>
{
    try
    {
        const { data: html } = await axios.get(url);
        const parts = html.split('<div class="box-chap box-chap-');
        let content = parts[1];
        content = content.split('">')[1];
        content = content.split('</div>')[0];
        return content;
    }
    catch (error)
    {
        console.error(error);
        throw error;
    }
}


function deleteAllFilesInFolder(folderPath: string): void
{
    try
    {
        const items = fs.readdirSync(folderPath);
        for (const item of items)
        {
            const itemPath = path.join(folderPath, item);
            if (fs.statSync(itemPath).isFile())
            {
                fs.unlinkSync(itemPath);
                console.log(`Deleted file: ${itemPath}`);
            }
        }
    }
    catch (error)
    {
        console.error(error);
    }
}

function getAllFilesInFolder(folderPath = './data'): string[]
{
    try
    {
        const items = fs.readdirSync(folderPath);
        const files = items.filter(item =>
        {
            const itemPath = path.join(folderPath, item);
            return fs.statSync(itemPath).isFile();
        });
        return files.map(file => path.join(folderPath, file));
    }
    catch (error)
    {
        console.error('Lỗi khi đọc thư mục:', error);
        return [];
    }
}

function loadFilesToJson(filePaths: string[]): Record<string, any>[]
{
    const jsonData: Record<string, any>[] = [];
    for (const filePath of filePaths)
    {
        try
        {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const parsedData = JSON.parse(fileContent);
            jsonData.push(parsedData);
        }
        catch (error)
        {
            console.error(`Error ${filePath}:`, error);
        }
    }
    return jsonData;
}

const files = loadFilesToJson(getAllFilesInFolder());

files.filter((file) => file.cloned === false).forEach(async (file) =>
{
    const promises = [];
    const { baseUrl, name, totalChapters } = file;
    console.log(`Crawling ${name}...`);
    const folderPath = `./chapters/${name}`;
    if (!fs.existsSync(folderPath))
    {
        fs.mkdirSync(folderPath, { recursive: true });
    }
    else
    {
        deleteAllFilesInFolder(folderPath);
    }
    // Create the folder if it doesn't exist
    for (let i = 1; i <= totalChapters; i++)
    {
        const url = baseUrl + i;
        let id = i;
        if(i % 50 == 0)
        {
            // Wait for 5 second to avoid overloading the server
            console.log(`Waiting for 5 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        promises.push(cloneHTML(url)
                .then((html) =>
                {
                    fs.writeFileSync(`./chapters/${name}/${id}.text`, html);
                    console.log(`[${name}] Chapter ${i} crawled successfully.`);
                })
                .catch((error) => console.error(error)));
    }
    Promise.all(promises)
           .then(() => console.log(`All chapters of ${name} crawled successfully.`))
           .catch((error) => console.error(`Error crawling chapters of ${name}:`, error));
});
