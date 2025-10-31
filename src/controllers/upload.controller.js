import { StatusCodes } from "http-status-codes";
import path from "path";
import fs from "fs";

async function handleUploadedFile(req, res) {
    if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "No file uploaded"
        });
    }

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "File uploaded successfully",
        data: {
            filename: req.file.filename,
            uri: 'https://' + req.get('host') + '/upload/' + req.file.filename
        }
    });
}

async function getUploadedFile(req, res) {
    const filename = req.params.filename;
    const filePath = path.resolve(process.cwd(), "uploads", filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "File not found"
        });
    }

    // Send the file
    res.sendFile(filePath);
}


export default {
    handleUploadedFile,
    getUploadedFile
};

