import * as xlsx from 'xlsx'
import * as fs from 'fs'

const fileBuffer = fs.readFileSync('./BASH 2025 Summer_Players-Extended.xlsx')
const workbook = xlsx.read(fileBuffer, { type: 'buffer' })

const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]

// Read as objects, using first row as headers
const data = xlsx.utils.sheet_to_json(sheet)

console.log("Row 1 as object:");
console.log(JSON.stringify(data[0], null, 2));
