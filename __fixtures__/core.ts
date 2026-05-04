import type * as core from '@actions/core'
import { mock } from 'node:test'

export const debug = mock.fn<typeof core.debug>()
export const error = mock.fn<typeof core.error>()
export const info = mock.fn<typeof core.info>()
export const getInput = mock.fn<typeof core.getInput>()
export const setOutput = mock.fn<typeof core.setOutput>()
export const setFailed = mock.fn<typeof core.setFailed>()
export const warning = mock.fn<typeof core.warning>()
