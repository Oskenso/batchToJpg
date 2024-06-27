#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PQueue from 'p-queue';
import chalk from 'chalk';
import minimist from 'minimist';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);


//options
const argv = minimist(process.argv.slice(2));
const deleteOriginal = argv['delete-original'] != undefined;
const excludePaths = argv.exclude ? (Array.isArray(argv.exclude) ? argv.exclude : [argv.exclude]) : [];

//p-queue
const totalCPUs = os.cpus().length;
const maxConcurrency = Math.max(totalCPUs - 2, 1);
const maxFilesPerBatch = 1000;
const queue = new PQueue({ concurrency: maxConcurrency });

//default options
const inputFolder = argv._[0] || '';
const quality = 90; // JPEG quality

async function toJpg(file) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.png') {
        const outputFileName = path.join(path.dirname(file), path.basename(file, ext) + '.jpg');
        const command = `cjpeg -quality ${quality} -outfile "${outputFileName}" "${file}"`;

        try {
            await execPromise(command);
            console.log(chalk.green(`Successfully converted ${file} to ${outputFileName}`));
            
            if (deleteOriginal) {
                await fs.unlink(file);
                console.log(chalk.yellow(`Deleted original file ${file}`));
            }
        } catch (err) {
            console.error(chalk.red(`Error converting ${file}:`, err));
        }
    }
}

async function getFilesRecursively(directory) {
    let results = [];
    let stack = [directory];

    while (stack.length > 0) {
        const currentDir = stack.pop();
        const list = await fs.readdir(currentDir, { withFileTypes: true });

        for (const file of list) {
            const filePath = path.join(currentDir, file.name);
            const relativePath = path.relative(directory, filePath);

            // Check if the file or directory matches any exclude paths
            if (excludePaths.some(exclude => relativePath.startsWith(exclude))) {
                continue;
            }

            if (file.isDirectory()) {
                if (file.name === 'node_modules' || file.name.startsWith('.')) {
                    continue; // Skip node_modules and hidden directories
                }
                stack.push(filePath);
            } else if (!file.name.startsWith('.') && path.extname(file.name).toLowerCase() === '.png') {
                // Skip hidden files
                results.push(filePath);

                if (results.length >= maxFilesPerBatch) {
                    await processFilesBatch(results);
                    results = [];
                }
            }
        }
    }

    if (results.length > 0) {
        await processFilesBatch(results);
    }
}

async function processFilesBatch(files) {
    await Promise.all(files.map(file => queue.add(() => toJpg(file))));
}

async function showHelp() {
    const osType = os.type().toLowerCase();
    let examplePath;

    if (osType.includes('win')) {
        examplePath = 'C:\\Users\\MyUser\\Pictures';
    } else if (osType.includes('darwin')) {
        examplePath = '/Users/myuser/Pictures';
    } else {
        examplePath = '/home/user/Pictures';
    }

    console.log(`
${chalk.blue('Usage:')}
    batchToJpg [<folder>] [--delete-original] [--exclude=<path>...]

${chalk.blue('Description:')}
    This script recursively converts all PNG files in the specified folder to JPEG format.

${chalk.blue('Parameters:')}
    <folder>                The folder to process. If omitted, the script displays this help message.
    --delete-original       Delete the original PNG files after conversion.
    --exclude=<path>        Specifies paths to exclude from processing. Multiple --exclude options can be provided.

${chalk.blue('Examples:')}
    ${examplePath ? `batchToJpg ${examplePath}` : ""}
    ${examplePath ? `batchToJpg ${examplePath} --delete-original` : ""}
    ${examplePath ? `batchToJpg ${examplePath} --exclude=path/to/exclude` : ""}
    `);
}

async function main() {
    if (!inputFolder) {
        await showHelp();
        return;
    }

    try {
        await getFilesRecursively(inputFolder);
        await queue.onIdle(); // Wait for all tasks to complete
        console.log(chalk.blue('All files have been processed.'));
    } catch (err) {
        console.error(chalk.red('Error processing files:', err));
    }
}

// Handle OS termination signals
function handleTerminationSignal(signal) {
    console.log(chalk.yellow(`Received ${signal} signal, shutting down gracefully...`));
    queue.onIdle().then(() => {
        console.log(chalk.blue('All ongoing tasks have been completed.'));
        process.exit(0);
    }).catch(err => {
        console.error(chalk.red('Error during shutdown:', err));
        process.exit(1);
    });
}

// Listen for termination signals (e.g., from OS)
process.on('SIGINT', () => handleTerminationSignal('SIGINT'));
process.on('SIGTERM', () => handleTerminationSignal('SIGTERM'));

main();