interface ImageDimensions {
    width: number;
    height: number;
  }
  
  export function calculateImageTokens(dimensions: ImageDimensions, detail: 'low' | 'high'): number {
    if (detail === 'low') {
      return 85;
    }
  
    let { width, height } = dimensions;
  
    // Scale down to fit within 2048x2048 square
    if (width > 2048 || height > 2048) {
      const scale = 2048 / Math.max(width, height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
  
    // Scale such that the shortest side is 768px
    const scale = 768 / Math.min(width, height);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  
    // Calculate number of 512px squares
    const squaresX = Math.ceil(width / 512);
    const squaresY = Math.ceil(height / 512);
    const totalSquares = squaresX * squaresY;
  
    return 85 + (totalSquares * 5667);
  }
  
  export function calculateCost(tokens: number): number {
    return (tokens / 1000000) * 0.15; // $0.15 per 1M tokens for input
  }