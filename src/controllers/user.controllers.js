import { asyncHandler } from "../db/asyncHandler.js";


const registerUser = asyncHandler( async (req ,res) => {
   return res.status(200).json({
        message: "sameer"
    })

})
export {registerUser}