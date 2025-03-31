const axios = jest.requireActual('axios');

const mockAxios = {
  ...axios,
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  }))
};

module.exports = mockAxios; 