import * as xlsx from 'xlsx'
import * as fs from 'fs'

const fileBuffer = fs.readFileSync('BASH 2024 Summer_Players-Extended.xlsx')
const workbook = xlsx.read(fileBuffer, { type: 'buffer' })
const sheetName = workbook.SheetNames[0]
const sheet = workbook.Sheets[sheetName]
const rawData = xlsx.utils.sheet_to_json<any>(sheet)

const mappedPlayers = rawData.map((row) => {
  const firstName = row["FirstName"]?.toString().trim() || ""
  const lastName = row["LastName"]?.toString().trim() || ""
  return `${firstName} ${lastName}`.trim()
}).filter(n => n.length > 0)

console.log("Raw Data length:", rawData.length)
console.log("Mapped Players length:", mappedPlayers.length)
if (mappedPlayers.length === 0) {
  console.log("First row:", rawData[0])
} else {
  console.log("First 3 mapped names:", mappedPlayers.slice(0, 3))
}
