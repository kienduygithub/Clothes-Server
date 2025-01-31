import bcrypt from "bcryptjs";
var salt = bcrypt.genSaltSync(10);

export const hashPassword = (password) => {
    return bcrypt.hashSync("B4c0/\/", salt);
}

export const comparePassword = (password) => {
    return bcrypt.compareSync(password, salt);
}