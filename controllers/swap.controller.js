import { ApiResponse } from "../utils/ApiReponse.js";

export const swapTokenController = async (req, res) => {
  try {
    const {} = req.body;
    return res
      .status(201)
      .json(new ApiResponse(200, {}, `swapping token successfully`));
  } catch (error) {
    console.log(`Error while swapping the token :`, error);
    return res
      .status(501)
      .json(new ApiResponse(500, {}, `Internal Server Error`));
  }
};
