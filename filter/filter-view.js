import React, {useCallback, useEffect, useState} from 'react'
import deepmerge from 'deepmerge'
import {navigation} from '../navigation/navigation'
import {parseQuery} from '../navigation/query'
import {Dropdown} from '../controls/dropdown'
import {resolveFilterEditor} from './filter-editors'
import './filter.scss'

let fieldDescriptionMapping = {}

function FilterCondition({field, value, setValue, removeFilter, edit}) {
    const updateValue = useCallback(function (value) {
        setValue(field, value)
        //reset cursor when apply filter
        navigation.updateQuery({cursor: undefined})
    }, [field, setValue])

    const removeValue = useCallback(function () {
        removeFilter(field, value)
        //reset cursor when remove applied filter
        if (!!value) {
            navigation.updateQuery({cursor: undefined})
        }
    }, [field, value, removeFilter])

    const childProps = {value, edit}
    const filter = fieldDescriptionMapping[field]
    if (edit || filter.multi === false) {
        childProps.setValue = updateValue
    }

    const editor = resolveFilterEditor(field)
    const title = !edit ? '' : (field === 'type' ? '' : filter.title)
    return <span className="filter-condition condensed" title={edit ? '' : filter.description}>
        <span className={'icon-' + filter.icon}/>
        {title} {React.createElement(editor, childProps)}
        {removeFilter ?
            <a href="#" className="icon-delete-circle" onClick={removeValue} title="Remove filter"/> :
            !!setValue ? <>&emsp;&nbsp;&nbsp;</> : <>&emsp;</>}
    </span>
}
/**
 * Parses and validates filter parameters from the current URL query string
 * @param {object} [fields] - Custom filter field definitions
 * @return {object}
 */
export function parseFiltersFromQuery(fields = fieldDescriptionMapping) {
    const params = parseQuery()
    const filters = {}
    let isEmpty = true
    for (const [key, value] of Object.entries(params)) {
        const filterDescriptor = fields[key]
        if (!filterDescriptor)
            continue //skip unrelated query parameters
        filters[key] = value
        isEmpty = false
    }
    return filters
}

function FiltersGroup({filters, replaceFilter, removeFilter, edit = false}) {
    if (!filters)
        return null
    return <>{Object.entries(filters).map(([field, values]) => {
        if (!(values instanceof Array)) {
            return <FilterCondition key={field} field={field} value={values} edit={edit} setValue={replaceFilter}
                                    removeFilter={removeFilter}/>
        }
        if (!values.length)
            return null
        return <React.Fragment key={field}>
            {values.map(value => <FilterCondition key={value} field={field} value={value} edit={edit}
                                                  setValue={replaceFilter} removeFilter={removeFilter}/>)}
        </React.Fragment>
    })}</>
}

/**
 * A component for managing search filters
 * @param {object} [presetFilter] - Initial base filters
 * @param {object} [fields] - Custom filter field definitions
 * @param {func} [onChange] - Callback triggered when filters change
 */
export function FilterView({presetFilter, fields = {}, onChange}) {
    fieldDescriptionMapping = fields
    const [filters, setFilters] = useState(presetFilter || {})
    const [_, setSerializedFilter] = useState(JSON.stringify(filters))

    const availableFields = []
    const readyFilters = {}
    const editFilters = {}
    let editorMode = false
    for (const [field, props = {}] of Object.entries(fieldDescriptionMapping)) {
        const values = filters[field]
        if (values !== undefined) {
            if (values instanceof Array) {
                const newValues = readyFilters[field] = []
                for (let i = 0; i < values.length; i++) {
                    const value = values[i]
                    if (!value) {
                        editFilters[field] = [value]
                        editorMode = true
                    } else if (!presetFilter || !presetFilter[field]?.includes(value)) {
                        newValues.push(value)
                    }
                }
            } else {
                if (!values) {
                    editFilters[field] = values
                    editorMode = true
                } else {
                    readyFilters[field] = values
                }
            }
        }
        if (props.multi !== false || !values) {
            availableFields.push({
                value: field,
                title: props.description,
                icon: 'icon-' + props.icon
            })
        }
    }

    const updateExternalFilters = useCallback(function (newFilters) {
        setSerializedFilter(prev => {
            const newValue = JSON.stringify(newFilters)
            if (prev !== newValue) {
                setTimeout(() => onChange(deepmerge(presetFilter, newFilters)), 100)
                return newValue
            }
            return prev
        })
    }, [onChange])

    useEffect(() => {
        const queryParams = parseFiltersFromQuery(fields)
        setFilters(queryParams)
        updateExternalFilters(queryParams)
    }, [fields])


    const replaceFilter = useCallback((field, value) => setTimeout(() => setFilters(prev => {
        const newFilters = {...prev}
        const filter = fieldDescriptionMapping[field] || {}
        //atomic values
        if (filter.multi === false) {
            if (value === null) {
                delete newFilters[field]
                updateExternalFilters(newFilters)
            } else {
                newFilters[field] = value
                if (value) {
                    updateExternalFilters(newFilters)
                }
            }
            return newFilters
        }
        //multi-values
        let values = newFilters[field]
        if (!values) {
            values = newFilters[field] = []
        }
        if (value !== null) {
            if (!values.includes(value)) {
                if (values[values.length - 1] === '') {
                    values.pop()
                }
                values.push(value)
                if (value) {
                    updateExternalFilters(newFilters)
                }
            }
        } else {
            const idx = values.indexOf('')
            if (idx >= 0) {
                values.splice(idx, 1)
                updateExternalFilters(newFilters)
            }
        }
        return newFilters
    }), 100), [updateExternalFilters])

    const removeFilter = useCallback((field, value) => setFilters(prev => {
        const newFilters = {...prev}
        const filter = fieldDescriptionMapping[field] || {}
        //atomic value
        if (filter.multi === false) {
            if (newFilters[field] || newFilters[field] === '') {
                newFilters[field] = undefined
                updateExternalFilters(newFilters)
            }
            return newFilters
        }
        //multi-values
        const values = newFilters[field]
        const idx = values.indexOf(value)
        if (idx >= 0) {
            values.splice(idx, 1)
            updateExternalFilters(newFilters)
        }
        return newFilters
    }), [updateExternalFilters])

    const addFilter = useCallback(field => {
        replaceFilter(field, '')
    }, [replaceFilter])

    const title = <span className="nowrap"><span className="icon icon-add-circle"/>Add filter</span>

    return <div className="op-filters">
        <div className="mobile-only micro-space"/>
        <span className="icon-filter"/>&nbsp;Filters&emsp;
        <FiltersGroup filters={presetFilter}/>
        <FiltersGroup filters={readyFilters} replaceFilter={replaceFilter} removeFilter={!editorMode ? removeFilter : null}/>
        {!editorMode ?
            <Dropdown title={title} options={availableFields} onChange={addFilter}/> :
            <div className="micro-space">
                <FiltersGroup filters={editFilters} replaceFilter={replaceFilter} removeFilter={removeFilter} edit/>
            </div>}
        <div className="micro-space"/>
    </div>
}

/**
 * @callback FilterView~OnChange
 * @param {Object} mergedFilters - The combination of preset filters and newly selected values.
 */