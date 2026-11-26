/** the message of a failed backend response (Nest sends a string or a list) */
export const responseMessage = async (response: Response) => {
  const { message } = await response.json().catch(() => ({}));
  return (Array.isArray(message) ? message[0] : message) as string | undefined;
};
