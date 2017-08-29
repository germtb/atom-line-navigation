'use babel'

import ReactDOM from 'react-dom'
import React from 'react'
import { Provider, connect } from 'react-redux'
import fuzzy from 'fuzzy'
import classNames from 'classnames'

import {
	searchLabel,
	searchStatus,
	editor,
	visible,
	lineIndex,
	results
} from './selectors'

const FuzzyLineWrapper = ({ visible }) => {
	return visible ? <EnhancedFuzzyLine /> : null
}

let markers = []

export default connect(state => ({
	visible: visible(state)
}))(FuzzyLineWrapper)

function FuzzyMatch({ match }) {
	const nodes = []
	for (let i = 0; i < match.length; i++) {
		const character = match[i]
		if (character === '<' && match[i + 2] && match[i + 2] === '>') {
			nodes.push(
				<div className="fuzzy-match__character">
					{match[i + 1]}
				</div>
			)
			i += 2
		} else {
			if (typeof nodes[nodes.length - 1] === 'string') {
				nodes[nodes.length - 1] += character
			} else {
				nodes.push(character)
			}
		}
	}

	return (
		<div className="fuzzy-match">
			{nodes}
		</div>
	)
}

class FuzzyLine extends React.PureComponent {
	constructor(props) {
		super(props)
		this.search = this.search.bind(this)
		this.hide = this.hide.bind(this)
		this.next = this.next.bind(this)
		this.previous = this.previous.bind(this)
		this.selectAll = this.selectAll.bind(this)
		this.focus = this.focus.bind(this)
		this.bufferDisposable = null
		this.workspaceDisposable = null
	}

	componentDidMount() {
		this.props.setSearchEditor(this.searchEditor)
		this.searchEditor.addEventListener('core:cancel', this.hide)
		this.searchEditor.addEventListener('line-navigation:next', this.next)
		this.searchEditor.addEventListener(
			'line-navigation:previous',
			this.previous
		)
		this.searchEditor.addEventListener('line-navigation:all', this.selectAll)

		const model = this.searchEditor.getModel()
		model.setPlaceholderText('Fuzzy search in this buffer')

		const buffer = this.searchEditor.getModel().getBuffer()
		this.bufferDisposable = buffer.onDidChange(_ => {
			this.search()
		})
		this.workspaceDisposable = atom.workspace.onDidStopChangingActivePaneItem(
			editor => {
				if (editor.getBuffer) {
					this.props.setEditor(editor)
					this.search()
				} else {
					this.hide()
				}
			}
		)
	}

	componentWillUnmount() {
		this.bufferDisposable.dispose()
		this.workspaceDisposable.dispose()
	}

	search() {
		const buffer = this.searchEditor.getModel().getBuffer()
		const pattern = buffer.getText()
		if (pattern.length < 3) {
			this.props.setSearchResults({
				pattern,
				results: []
			})
			return
		}

		const lines = this.props.editor.getBuffer().getLines()
		const results = fuzzy
			.filter(pattern, lines, {
				pre: '<',
				post: '>'
			})
			.sort(match => match.score)
			.reverse()
			.map(match => {
				const range = [[match.index, 0], [match.index, match.original.length]]
				range.match = match
				return range
			})

		this.props.setSearchResults({
			pattern,
			results
		})
	}

	hide() {
		this.props.hide()
		const view = atom.views.getView(this.props.editor)
		view.focus()
	}

	next() {
		if (this.props.status !== 'SEARCH_SUCCESS') {
			return
		}
		this.props.next({ resultsCount: this.props.results.length })
		this.focus()
	}

	previous() {
		if (this.props.status !== 'SEARCH_SUCCESS') {
			return
		}
		this.props.previous({ resultsCount: this.props.results.length })
		this.focus()
	}

	focus() {
		this.searchEditor.focus()
	}

	selectAll() {
		if (!this.props.results.length) {
			return
		}
		this.props.editor.setSelectedBufferRanges(this.props.results)
		const view = atom.views.getView(this.props.editor)
		view.focus()
	}

	render() {
		const { searchLabel, status, lineIndex } = this.props

		const findAndReplaceClassNames = classNames('find-and-replace', {
			'has-no-results': status === 'SEARCH_FAILED',
			'has-results': status === 'SEARCH_SUCCESS'
		})

		return (
			<div className="line-navigation-wrapper">
				<atom-panel
					ref={element => {
						if (!element) {
							return
						}
						element.className = 'tool-panel panel-bottom bottom'
					}}
				>
					<div className={findAndReplaceClassNames}>
						<header className="header">
							{this.props.results.map(({ match }, index) => {
								const selected = index === lineIndex
								return (
									<div className="line-navigation-match">
										<span className="line-navigation-match__line-number">
											{match.index + 1}
										</span>
										<div
											className={classNames('line-navigation-match__line', {
												'line-navigation-match__line--selected': selected
											})}
										>
											<FuzzyMatch match={match.string} />
										</div>
									</div>
								)
							})}
						</header>
						<section
							style={{ justifyContent: 'center' }}
							className="input-block find-container"
						>
							<div className="input-block-item input-block-item--flex editor-container">
								<atom-text-editor
									style={{
										transition: 'ease-in-out .2s'
									}}
									mini
									ref={element => {
										if (!element) {
											return
										}
										element.className = classNames(
											'editor mini line-navigation',
											{
												'is-focused': element.classList.contains('is-focused')
											}
										)
										this.searchEditor = element
										this.focus()
									}}
									placeholder="SOMETHING"
								/>
							</div>
							<div
								style={{
									position: 'absolute',
									zIndex: 5,
									right: 18,
									top: 4,
									textAlign: 'right',
									width: 100,
									margin: 0
								}}
								className="find-meta-container"
							>
								<span
									style={{
										transition: 'ease-in-out .2s'
									}}
									className="text-subtle result-counter"
								>
									{searchLabel}
								</span>
							</div>
						</section>
					</div>
				</atom-panel>
			</div>
		)
	}
}

const EnhancedFuzzyLine = connect(
	state => ({
		searchLabel: searchLabel(state),
		editor: editor(state),
		status: searchStatus(state),
		results: results(state),
		lineIndex: lineIndex(state)
	}),
	dispatch => ({
		next: payload => dispatch({ type: 'NEXT', payload }),
		previous: payload => dispatch({ type: 'PREVIOUS', payload }),
		hide: () => dispatch({ type: 'HIDE' }),
		setSearchResults: payload =>
			dispatch({ type: 'SET_SEARCH_RESULTS', payload }),
		setSearchEditor: payload =>
			dispatch({ type: 'SET_SEARCH_EDITOR', payload }),
		setEditor: payload => dispatch({ type: 'SET_EDITOR', payload })
	})
)(FuzzyLine)
