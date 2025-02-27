import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { parse, format, isValid } from 'date-fns';
import { calculateImageTokens, calculateCost } from '@/utils/tokenCalculator';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const parseAndFormatDate = (dateString: string): string => {
  const formats = [
    'dd-MM-yyyy HH:mm',
    'dd-MM-yy HH:mm',
    'dd/MM/yyyy',
    'yyyy-MM-dd'
  ];

  for (const formatString of formats) {
    const parsedDate = parse(dateString, formatString, new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  // If no format matches, return the original string
  console.warn(`Unable to parse date: ${dateString}`);
  return dateString;
};

export async function POST(request: Request) {
  try {
    const { s3Url, imageDimensions } = await request.json();

    const imageTokens = calculateImageTokens(imageDimensions, 'high');
    const imageCost = calculateCost(imageTokens);

    console.log(`Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);
    console.log(`Image tokens: ${imageTokens}`);
    console.log(`Image cost: $${imageCost.toFixed(6)}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a receipt analysis assistant. Always respond with valid JSON only, starting with {\"data\":"
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this receipt image and extract the following fields: date, description, invoiceNumber, amount. Respond with a JSON object only, no other text."
            },
            {
              type: "image_url",
              image_url: {
                "url": s3Url,
              },
            }
          ],
        },
      ],
      max_tokens: 150,
    });

    const resultText = response.choices[0]?.message?.content;
    console.log("Raw OpenAI response:", resultText);

    if (!resultText) {
      return NextResponse.json({ error: 'No content in OpenAI response' }, { status: 500 });
    }

    const totalTokens = imageTokens + (response.usage?.total_tokens || 0);
    const cost = calculateCost(totalTokens);

    console.log(`Image token cost: ${imageTokens}`);
    console.log(`Image dimensions: ${imageDimensions.width}x${imageDimensions.height}`);
    const tiles = Math.ceil(imageDimensions.width / 512) * Math.ceil(imageDimensions.height / 512);
    console.log(`Number of 512x512 tiles: ${tiles}`);
    console.log(`Base tokens: 85`);
    console.log(`Tile tokens: ${tiles * 170}`);
    console.log(`Total image tokens: ${imageTokens}`);
    console.log(`Total tokens used: ${totalTokens}`);
    console.log(`Estimated cost: $${cost.toFixed(4)}`);

    let receiptData;

    try {
      // Extract JSON from within backticks if present
      const jsonMatch = resultText.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : resultText;
      
      receiptData = JSON.parse(jsonString);
      console.log("Successfully parsed JSON:", receiptData);

      // Standardize the date format
      if (receiptData.data && receiptData.data.date) {
        receiptData.data.date = parseAndFormatDate(receiptData.data.date);
      }

    } catch (error) {
      console.error('Error parsing JSON from OpenAI response:', error);
      return NextResponse.json({ error: 'Error parsing receipt data' }, { status: 500 });
    }

    console.log("Final receiptData to be sent back:", receiptData);
    return NextResponse.json({ ...receiptData, tokens: totalTokens, cost });
  } catch (error) {
    console.error('Error analyzing receipt:', error);
    return NextResponse.json({ error: 'Error analyzing receipt' }, { status: 500 });
  }
}