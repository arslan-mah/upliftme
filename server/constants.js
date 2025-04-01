export const DB_NAME = "upliftme"
const options = {
    httpOnly: true,
    secure: false, // 🔥 Set to true if using HTTPS
    sameSite: "lax", // 🔥 Set to 'none' if using HTTPS
}
export default  options