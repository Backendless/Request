import { cache } from '../../src/cache'

import * as QS from '../../src/qs'

jest.mock('../../src/utils', () => {
  const originalModule = jest.requireActual('../../src/utils')

  return {
    __esModule: true, ...originalModule, isNodeJS: jest.fn(() => true), isBrowser: jest.fn(() => false),
  }
})

describe('QueryString Utils', () => {

  afterEach(() => {
    cache.deleteAll()
  })

  describe('stringify', () => {
    it('converts special chars', async () => {
      expect(QS.stringify({ q: '\'' })).toEqual('q=\'')
      expect(QS.stringify({ q: '"' })).toEqual('q=%22')
      expect(QS.stringify({ q: ' ' })).toEqual('q=%20')
      expect(QS.stringify({ q: '\n' })).toEqual('q=%0A')
      expect(QS.stringify({ q: '%' })).toEqual('q=%25')
      expect(QS.stringify({ q: '$' })).toEqual('q=%24')
      expect(QS.stringify({ q: '&' })).toEqual('q=%26')
    })
  })

})



