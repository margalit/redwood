import { createSpiedPlugin, createTestkit } from '@envelop/testing'

import { testSchema, testQuery } from '../__fixtures__/common'
import { useRedwoodAuthContext } from '../useRedwoodAuthContext'

jest.mock('@redwoodjs/api', () => {
  return {
    //@ts-expect-error jest types being silly
    ...jest.requireActual('@redwoodjs/api'),
    getAuthenticationContext: jest.fn().mockResolvedValue([
      { sub: '1', email: 'ba@zin.ga' },
      {
        type: 'mocked-auth-type',
        schema: 'mocked-schema-bearer',
        token: 'mocked-undecoded-token',
      },
      { event: {}, context: {} },
    ]),
  }
})

describe('useRedwoodAuthContext: ', () => {
  const spiedPlugin = createSpiedPlugin()

  const expectContextContains = (obj) => {
    expect(spiedPlugin.spies.beforeContextBuilding).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining(obj),
      })
    )
  }

  beforeEach(() => {
    spiedPlugin.reset()
  })

  it('Updates context with output of current user', async () => {
    const MOCK_USER = {
      id: 'my-user-id',
      name: 'Mockity MockFace',
    }

    const mockedGetCurrentUser = jest.fn().mockResolvedValue(MOCK_USER)

    const testkit = createTestkit(
      [useRedwoodAuthContext(mockedGetCurrentUser), spiedPlugin.plugin],
      testSchema
    )

    await testkit.execute(testQuery, {}, { requestContext: {} })

    expectContextContains({
      currentUser: MOCK_USER,
    })

    expect(mockedGetCurrentUser).toHaveBeenCalledWith(
      { email: 'ba@zin.ga', sub: '1' },
      {
        schema: 'mocked-schema-bearer',
        token: 'mocked-undecoded-token',
        type: 'mocked-auth-type',
      },
      { context: {}, event: {} }
    )
  })

  it('Does not swallow exceptions raised in getCurrentUser', async () => {
    const mockedGetCurrentUser = jest
      .fn()
      .mockRejectedValue(new Error('Hey man, where is my DB?'))

    const testkit = createTestkit(
      [useRedwoodAuthContext(mockedGetCurrentUser)],
      testSchema
    )

    await expect(async () => {
      await testkit.execute(testQuery, {}, { requestContext: {} })
    }).rejects.toEqual(new Error('Hey man, where is my DB?'))
    expect(mockedGetCurrentUser).toHaveBeenCalled()
  })
})
