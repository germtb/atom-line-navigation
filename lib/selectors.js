'use babel'

import { createSelector } from 'reselect'

const pattern = state => state.pattern
export const results = state => state.results
export const editor = state => state.editor
export const visible = state => state.visible
const lineIndex = state => state.lineIndex
const searchEditor = state => state.searchEditor

export const searchStatus = createSelector(
	pattern,
	results,
	(pattern, results) => {
		if (!pattern || pattern.length < 3) {
			return 'NO_SEARCH'
		} else if (results && results.length > 0) {
			return 'SEARCH_SUCCESS'
		} else {
			return 'SEARCH_FAILED'
		}
	}
)

export const header = createSelector(
	searchStatus,
	results,
	pattern,
	(searchStatus, results, pattern) => {
		if (searchStatus === 'NO_SEARCH') {
			return 'Fuzzy line search'
		}

		return `${results.length} results for '${pattern}'`
	}
)

export const searchLabel = createSelector(
	searchStatus,
	lineIndex,
	results,
	(searchStatus, lineIndex, results) => {
		if (searchStatus === 'NO_SEARCH') {
			return ''
		} else if (searchStatus === 'SEARCH_SUCCESS') {
			return `${lineIndex + 1} of ${results.length}`
		} else {
			return 'No results'
		}
	}
)

export const isFocused = createSelector(searchEditor, searchEditor => {
	return searchEditor && searchEditor.classList.contains('is-focused')
})

export const selectedMatch = createSelector(
	results,
	lineIndex,
	(results, lineIndex) => results[lineIndex]
)
