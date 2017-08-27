'use babel'

import { CompositeDisposable } from 'atom'
import { createStore } from 'redux'
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import FuzzyView, { initReact } from './line-navigation-fuzzy-view'

import { searchStatus, isFocused, selectedMatch } from './selectors'

import reducers from './reducers'

export default {
	subscriptions: null,
	store: createStore(reducers),

	onChange() {
		const state = this.store.getState()
		const editor = state.editor
		if (searchStatus(state) === 'SEARCH_SUCCESS') {
			editor && editor.setSelectedBufferRange(selectedMatch(state))
		}
	},

	activate() {
		const reactRoot = document.createElement('div')
		ReactDOM.render(
			<Provider store={this.store}>
				<FuzzyView />
			</Provider>,
			reactRoot
		)
		atom.workspace.addBottomPanel({ item: reactRoot, model: {} })

		// Side effect: find a better solution
		this.store.subscribe(this.onChange.bind(this))

		this.subscriptions = new CompositeDisposable()
		this.subscriptions.add(
			atom.commands.add('atom-workspace', {
				'line-navigation:fuzzySearch': this.fuzzySearch.bind(this)
			})
		)
	},

	deactivate() {
		this.disposables = []
		this.subscriptions.dispose()

		this.renameView && this.renameView.destroy()
		this.renameView = null
	},

	serialize() {
		return {}
	},

	fuzzySearch() {
		if (this.store.getState().visible) {
			isFocused(this.store.getState()) ? this.hide() : this.focus()
		} else {
			this.show()
		}
	},

	show() {
		const editor = atom.workspace.getActiveTextEditor()
		this.store.dispatch({ type: 'SHOW', payload: editor })
	},

	focus() {
		const editor = atom.workspace.getActiveTextEditor()
		this.store.dispatch({ type: 'FOCUS', payload: editor })
		// Side effect: find a better solution
		this.store.getState().searchEditor.focus()
	},

	hide() {
		this.store.dispatch({ type: 'HIDE' })
		const editor = atom.workspace.getActiveTextEditor()
		const view = atom.views.getView(editor)
		view.focus()
	}
}
