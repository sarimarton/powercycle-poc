import xs from 'xstream'
import sample from 'xstream-sample'
import circular from 'powercycle/util/xstream/circular'

import { run } from '@cycle/run'
import { withState } from '@cycle/state'
import { useState } from 'react'
import { makeHTTPDriver } from '@cycle/http'

import './style.css'

import withPower, { makeDOMDriver } from 'powercycle'

import { get, map, Scope } from 'powercycle/util'
import { Collection, COLLECTION_DELETE } from 'powercycle/util/Collection'
import { ReactRealm, useCycleState } from 'powercycle/util/ReactRealm'

/** @jsx withPower.pragma */
/** @jsxFrag withPower.Fragment */

function ReactCounter (props, state) {
  const [count, setCount] = useState(0)

  return (
    <div style={props.style}>
      <div>Counter: {count}</div>
      <div><button onClick={() => setCount(count + 1)}>Increment</button></div>
    </div>
  )
}

function ReactComboboxWithCycleState (props) {
  const [state, setState] = useCycleState(props.sources)

  return (
    <>
      <label>Color: </label>
      <select value={state.color} onChange={e => { setState({ ...state, color: e.target.value }) }}>
        <option value='#1e87f0'>default</option>
        <option value='red'>red</option>
        <option value='purple'>purple</option>
        <option value='green'>green</option>
      </select>
    </>
  )
}

function ReactComponentWithCycleStateAndLens (props) {
  const [state, setState] = useCycleState(props.sources)

  return (
    <>
      <label>Color: </label>
      <select value={state} onChange={e => { setState(e.target.value) }}>
        <option value='#1e87f0'>default</option>
        <option value='red'>red</option>
        <option value='purple'>purple</option>
        <option value='green'>green</option>
      </select>
    </>
  )
}

function Counter (sources) {
  const inc = Symbol(0)
  const count$ = sources[inc].click
    .fold(count => count + 1, 0)

  return (
    <>
      {count$}<br />
      <button sel={inc}>Incremenet</button>
    </>
  )
}

function Combobox (sources) {
  return [
    <>
      <label>Color: </label>
      <select sel='select' value={get('color', sources)}>
        <option value='#1e87f0'>default</option>
        <option value='red'>red</option>
        <option value='purple'>purple</option>
        <option value='green'>green</option>
        <option value='gray'>gray</option>
        <option value='black'>black</option>
        <option value='orange'>orange</option>
      </select>
    </>,
    { state: sources.sel['select'].change['target.value']
      .debug(() => console.info('If this message is logged once at a time, ' +
        'that means that the view channels are properly scoped automatically.'))
      .map(value => prevState => ({ ...prevState, color: value }))
    }
  ]
}

function ComboboxWithLens (sources) {
  return (
    <>
      <label>Color: </label>
      <select value={get('', sources)} onChange={({ target: { value }}) => () => value}>
        <option value='#1e87f0'>default</option>
        <option value='red'>red</option>
        <option value='purple'>purple</option>
        <option value='green'>green</option>
      </select>
    </>
  )
}

function ShowState (sources) {
  // return {
  //   react: sources.state.stream.map(state => <Code>{JSON.stringify(state)}</Code>)
  // }
  //
  // return power(
  //   <Code>{sources.state.stream.map(state => JSON.stringify(state))}</Code>,
  //   { /* event sinks */ },
  //   sources
  // )
  //
  // return [
  //   <Code>{sources.state.stream.map(state => JSON.stringify(state))}</Code>,
  //   { /* other sinks */ }
  // ]
  //
  // return (
  //   <Code>{sources.state.stream.map(state => JSON.stringify(state))}</Code>
  // )
  //
  // return (
  //   <Code>{map(JSON.stringify, sources)}</Code>
  // )

  return (
    <Code>{map(JSON.stringify)}</Code>
  )
}

function Code (sources) {
  return (
    <span className='uk-text-small' style={{ fontSize: 12, fontFamily: 'consolas, monospace' }}>
      {sources.props.children}
    </span>
  )
}

function CollectionDemo (sources) {
  return [
    <>
      <div>
        <Scope scope='foobar.list'>
          <button onClick={ev => prev => [...prev, { color: '#1e87f0' }]}>
            Add
          </button>
        </Scope>
      </div>
      <br />
      <div>
        <Collection for='foobar.list'>
          {src =>
            <pre>
              {/* Different ways to get state key */}
              {/* {src => <>{src.state.stream.map(s => s.idx)}</>} */}
              {/* <Scope scope='idx'>{get()}</Scope> */}
              {/* {map(s => s.idx)} */}
              {get('index')}

              .{' '}

              <Combobox scope='item' />

              <button
                style={{ float: 'right' }}
                onClick={{
                  state: ev$ => ev$.mapTo(COLLECTION_DELETE),
                  HTTP: ev$ => ev$.mapTo({ url: '?this-request-tests-that-collection-picks-up-all-sinks' })
                }}
              >
                Remove this 2
              </button>

              {src => [
                <button
                  style={{ float: 'right' }}
                  onClick={ev => COLLECTION_DELETE}
                >Remove this</button>,
                {
                  HTTP: src.el.click.mapTo({ url: '?this-request-tests-that-collection-picks-up-all-sinks' })
                }
              ]}

              <button
                style={{ float: 'right' }}
                onClick={{
                  outerState: ev$ => ev$
                    .compose(sample(src.state.stream))
                    .map(state => outerState => ({
                      ...outerState,
                      foobar: {
                        ...outerState.foobar,
                        list: state.collection.slice(0, state.index + 1)
                      }
                    }))
                }}
              >Remove below</button>

              <button
                style={{ float: 'right' }}
                onClick={{
                  outerState: ev$ => ev$
                    .compose(sample(src.state.stream))
                    .map(state => outerState => ({
                      ...outerState,
                      color: state.item.color
                    }))
                }}
              >Set</button>

              <br />

              <div style={{ color: get('item.color', src) }}>
                <br />
                <ShowState scope='item' />
              </div>
            </pre>
          }
        </Collection>
      </div>
    </>
  ]
}

function TodoList (sources) {
  const updateValue$ = sources.sel['addField'].change['target.value']
    .startWith('')

  const [value$, itemAdded$] = circular(
    reducer$ => xs.merge(
      updateValue$,
      reducer$.mapTo('')
    ).startWith(''),

    value$ => xs.merge(
      sources.sel['addButton'].click,
      sources.sel['addField'].keyDown.keyCode
        .filter(code => code === 13)
    ).compose(sample(value$))
  )

  const reducer$ = itemAdded$
    .map(text => prevState => [...prevState, { text }])

  return [
    <>
      <input sel='addField' value={value$} />&nbsp;
      <button sel='addButton'>Add</button>

      <Collection>
        <div>
          <input scope='item.text' value={get()} onChange={({ target: { value } }) => () => value} />
          &nbsp;
          <button onClick={() => COLLECTION_DELETE}>Remove</button>
        </div>
      </Collection>
    </>,
    { state: reducer$ }
  ]
}

function Card (sources) {
  return (
    <div
      className='uk-card uk-card-default uk-padding-small uk-card-primary'
      style={{ ...sources.props.style }}
    >
      {sources.props.title &&
        <h5>{sources.props.title}</h5>}
      <div>{sources.props.children}</div>
    </div>
  )
}

function main (sources) {
  const state$ = sources.state.stream

  const reducer$ = xs.of(() => ({
    color: 'gray',
    foobar: { list: [{ color: 'red' }, { color: 'green' }, { color: '#1e87f0' }, { color: 'purple' }] },
    todoList: [{ text: 'todo1' }, { text: 'todo2' }, { text: 'todo3' }],
    foo: { bar: { baz: 5 } }
  }))

  const color$ = state$.map(state => state.color)

  // return [
  //   <div>
  //     Timer: {xs.periodic(3000).startWith(-1).take(2)}
  //     <br />
  //     {src => <div>div1</div>}
  //   </div>,
  //   { state: reducer$ }
  // ]

  return [
    <div className='uk-padding-small'>
      <h2>Powercycle Showcase</h2>

      <div className='grid'>
        <Card title='Cycle JS components'>
          <div style={{ float: 'left' }}>
            Auto-scoped:<br />
            <Combobox />
            <br />
            <Combobox />
          </div>
          <div style={{ float: 'right' }}>
            With noscope:<br />
            <Combobox noscope />
            <br />
            <Combobox noscope />
          </div>
          <br style={{ clear: 'both' }} />
          (See the console for testing)
        </Card>

        <Card title='React components under <ReactRealm>'>
          <ReactRealm>
            <ReactCounter style={{ width: '90px', float: 'left' }} />
            <ReactCounter style={{ width: '90px', float: 'left' }} />
            text node
          </ReactRealm>
        </Card>

        <Card title='React component + Cycle state'>
          <ReactRealm>
            <ReactComboboxWithCycleState />
          </ReactRealm>
        </Card>

        <Card title='Little stuff'>
          Timer: {xs.periodic(1000).startWith(-1)}
          <br />
          Counter: <Counter />
        </Card>

        <Card title='State'>
          <ShowState />
        </Card>

        <Card title='Todo List'>
          <TodoList scope='todoList' />
        </Card>

        <Card title='Another counter' style={{ display: 'none' }}>
          <Counter />
        </Card>

        <Card title='Simple input' scope='color'>
          Color:
          { src =>
            <input value={get('', src)} onChange={({ target: { value }}) => () => value} />
          }
        </Card>

        <Card title={color$.map(color => `Stream travelling through prop: ${color}`)} />

        <Card title='Stream DOM prop' style={{ background: color$ }}>
          <Code>
            &lt;div style={'{{'} background: color$ {}}}&gt;
          </Code>
        </Card>

        <Card title='Scopes'>
          <ComboboxWithLens scope='color' />
          <br />
          foo.bar.baz: <ShowState scope='foo.bar.baz' />
          <Scope scope={{ state: {
            get: state => state.foo,
            set: (state, childState) => ({ ...state, foo: childState })
          } }}>
            <ShowState />
          </Scope>
        </Card>

        <Card title='React component + Cycle state + Scope'>
          <ReactRealm scope='color'>
            <ReactComponentWithCycleStateAndLens />
          </ReactRealm>
        </Card>

        <Card title='Collection'>
          <CollectionDemo />
        </Card>

      </div>
    </div>,
    { state: reducer$ }
  ]
}

const drivers = {
  react: makeDOMDriver(document.getElementById('app')),
  HTTP: makeHTTPDriver()
}

run(withState(withPower(main)), drivers)
