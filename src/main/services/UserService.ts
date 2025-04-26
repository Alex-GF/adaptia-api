import bcrypt from "bcryptjs";
import crypto from "crypto";

import container from "../config/container";
import UserRepository from "../repositories/mongoose/UserRepository";
import { processFileUris } from "./FileService";

class UserService {
    
    private userRepository: UserRepository;

    constructor () {
      this.userRepository = container.resolve('userRepository');
    }

    _createUserTokenDTO () {
      return {
        token: crypto.randomBytes(20).toString('hex'),
        tokenExpiration: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };
    }

    async _register (newUser: any, userType: "user" | "admin") {
      newUser.userType = userType;
      newUser.avatar = newUser.avatar || 'avatars/default-avatar.png';
      newUser = { ...newUser, ...this._createUserTokenDTO() };

      const registeredUser = await this.userRepository.create(newUser);
      // processFileUris(registeredUser, ['avatar'])
      return registeredUser;
    }
  
    async registerUser (data: any) {
      return this._register(data, 'user');
    }
  
    async registerAdmin (data: any) {
      return this._register(data, 'admin');
    }

    async loginByToken (token: string) {
      const user = await this.userRepository.findByToken(token);
      if (user && user.tokenExpiration! > new Date()) {
        processFileUris(user, ['avatar']);
        return user;
      }
      let errorMessage: string;
      if (user?.tokenExpiration) {
        errorMessage = user.tokenExpiration <= new Date() ? 'Token expired' : 'Token not valid';
      } else {
        errorMessage = 'Token not valid';
      }
      throw new Error(errorMessage);
    }

    async updateToken (token: string) {
      const user = await this.userRepository.findByToken(token);
      if (!user) {
        throw new Error('Token not valid');
      }

      const timeLeft = user.tokenExpiration!.getTime() - Date.now();
      if (timeLeft < 60 * 60 * 1000) { // less than 1 hour
        const updatedUser = await this.userRepository.updateToken(user.id, this._createUserTokenDTO());
        return {token: updatedUser!.token, tokenExpiration: updatedUser!.tokenExpiration};
      }

      return {token: user.token, tokenExpiration: user.tokenExpiration};
    }

    async _login (loginField: string, password: string, userType: "user" | "admin") {
    
      let user;
  
      if (userType === 'user') {
        user = await this.userRepository.findUserByUsername(loginField);
        if (!user) user = await this.userRepository.findUserByEmail(loginField);
      } else if (userType === 'admin') {
        user = await this.userRepository.findAdminByUsername(loginField);
        if (!user) user = await this.userRepository.findAdminByEmail(loginField);
      }

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const passwordValid = await bcrypt.compare(password, user.password);
      if (!passwordValid) {
        throw new Error('Invalid credentials');
      }
      const updatedUser = await this.userRepository.updateToken(user.id, this._createUserTokenDTO());
      processFileUris(updatedUser, ['avatar']);
      return updatedUser;
    }
  
    async loginAdmin (loginField: string, password: string) {
      return this._login(loginField, password, 'admin');
    }
  
    async loginUser (loginField: string, password: string) {
      return this._login(loginField, password, 'user');
    }
  
    async show (id: string) {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      processFileUris(user, ['avatar']);
      const propertiesToBeRemoved = ['password', 'createdAt', 'updatedAt', 'token', 'tokenExpiration', 'phone'];
      const userObject = Object.assign({}, user);
      propertiesToBeRemoved.forEach((property) => {
        delete (userObject as Record<string, any>)[property];
      });
      return userObject;
    }
  
    async update (id: string, data: any) {
      let userToUpdate = await this.userRepository.findById(id);
      if (!userToUpdate) {
        throw new Error('User not found');
      }

      // if (data.password) {
      //   const salt = await bcrypt.genSalt(5)
      //   data.password = await bcrypt.hash(data.password, salt)
      // }

      userToUpdate = {
        ...userToUpdate,
        ...data
      };

      const user = await this.userRepository.update(id, data);
      if (!user) {
        throw new Error('User not found');
      }
      processFileUris(user, ['avatar']);
      return user;
    }
  
    async destroy (id: string) {
      const result = await this.userRepository.destroy(id);
      if (!result) {
        throw new Error('User not found');
      }
      return true;
    }
  
    async exists (id: string) {
      return await this.userRepository.findById(id);
    }
  }
  
  export default UserService;
  