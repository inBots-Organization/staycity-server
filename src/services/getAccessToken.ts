// getAccessToken.ts

export async function getAccessToken(refreshToken: string): Promise<string> {
  const url:string = process.env["AQARA_API_ENDPOINT"] || "";

  try {
    console.log(url, refreshToken);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "config.auth.refreshToken",
        data: {
          refreshToken,
          Appid: process.env["AQARA_APP_ID"],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("result:", result);

    // if (result.code !== 0) {
    //   throw new Error(`API error: ${result.message}`);
    // }

    // return only the accessToken
    return result.result.accessToken;
  } catch (error) {
    console.error("Error fetching access token:", error);
    throw error;
  }
}
