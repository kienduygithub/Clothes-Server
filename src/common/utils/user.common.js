import bcrypt from "bcryptjs";
var salt = bcrypt.genSaltSync(10);

export const hashPassword = (password) => {
    return bcrypt.hashSync(password, salt);
}

export const comparePassword = (password, hashedPassword) => {
    return bcrypt.compareSync(password, hashedPassword);
}