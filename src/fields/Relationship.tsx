import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import qs from 'qs';
import { useTranslation } from 'react-i18next';
import { useConfig } from 'payload/components/utilities';
import { useAuth } from 'payload/components/utilities';
import {withCondition} from 'payload/components/forms';
import ReactSelect from 'payload/dist/admin/components/elements/ReactSelect';
import {useField} from 'payload/components/forms';
import {Label} from 'payload/components/forms';
import Error from 'payload/dist/admin/components/forms/Error';
import FieldDescription from 'payload/dist/admin/components/forms/FieldDescription';
import { relationship } from 'payload/dist/fields/validations';
import { Where } from 'payload/types';
import { PaginatedDocs } from 'payload/dist/mongoose/types';
import { useFormProcessing } from 'payload/dist/admin/components/forms/Form/context';
import optionsReducer from 'payload/dist/admin/components/forms/field-types/Relationship/optionsReducer';
import { FilterOptionsResult, GetResults, Option, Props, Value } from 'payload/dist/admin/components/forms/field-types/Relationship/types';
import { createRelationMap } from 'payload/dist/admin/components/forms/field-types/Relationship/createRelationMap';
import { useDebouncedCallback } from 'payload/dist/admin/hooks/useDebouncedCallback';
import wordBoundariesRegex from 'payload/dist/utilities/wordBoundariesRegex';
import { AddNewRelation } from 'payload/dist/admin/components/forms/field-types/Relationship/AddNew';
import { findOptionsByValue } from 'payload/dist/admin/components/forms/field-types/Relationship/findOptionsByValue';
import { GetFilterOptions } from 'payload/dist/admin/components/utilities/GetFilterOptions';
import { SingleValue } from 'payload/dist/admin/components/forms/field-types/Relationship/select-components/SingleValue';
import { MultiValueLabel } from 'payload/dist/admin/components/forms/field-types/Relationship/select-components/MultiValueLabel';
import { DocumentDrawerProps } from 'payload/dist/admin/components/elements/DocumentDrawer/types';
import { useLocale } from 'payload/components/utilities';

import 'payload/dist/admin/components/forms/field-types/Relationship/index.scss';

///? PROLLLY gunna have to redo the reducer ugh

const maxResultsPerRequest = 10;

const baseClass = 'relationship';

const Relationship: React.FC<Props> = (props) => {
  const {
    relationTo,
    validate = relationship,
    path,
    name,
    required,
    label,
    hasMany,
    filterOptions,
    admin: {
      readOnly,
      style,
      className,
      width,
      description,
      condition,
      isSortable = true,
      allowCreate = true,
    } = {},
  } = props;

  const config = useConfig();

  const {
    serverURL,
    routes: {
      api,
    },
    collections,
  } = config;

  const { t, i18n } = useTranslation('fields');
  const { permissions } = useAuth();
  const locale = useLocale();
  const formProcessing = useFormProcessing();
  const hasMultipleRelations = Array.isArray(relationTo);
  const [options, dispatchOptions] = useReducer(optionsReducer, []);
  const [lastFullyLoadedRelation, setLastFullyLoadedRelation] = useState(-1);
  const [lastLoadedPage, setLastLoadedPage] = useState<Record<string, number>>({});
  const [errorLoading, setErrorLoading] = useState('');
  const [filterOptionsResult, setFilterOptionsResult] = useState<FilterOptionsResult>();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedFirstPage, setHasLoadedFirstPage] = useState(false);
  const [enableWordBoundarySearch, setEnableWordBoundarySearch] = useState(false);
  const firstRun = useRef(true);
  const pathOrName = path || name;

  // Save Options based on Reducer

  type colorType = {
    name: string;
    id: string;
    color: string;
  }

  const [ colorOpts, setColorOpts ] = useState<colorType[]>();

  useEffect(()=>{
    console.log('OPTIONS', options);
  }, [options])

  const memoizedValidate = useCallback((value, validationOptions) => {
    return validate(value, { ...validationOptions, required });
  }, [validate, required]);

  const {
    value,
    showError,
    errorMessage,
    setValue,
    initialValue,
  } = useField<Value | Value[]>({
    path: pathOrName,
    validate: memoizedValidate,
    condition,
  });

  const [drawerIsOpen, setDrawerIsOpen] = useState(false);

  const getResults: GetResults = useCallback(
    async ({
      lastFullyLoadedRelation: lastFullyLoadedRelationArg,
      search: searchArg,
      value: valueArg,
      sort,
      onSuccess,
    }) => {
      if (!permissions) {
        return;
      }
      const lastFullyLoadedRelationToUse = typeof lastFullyLoadedRelationArg !== 'undefined'
        ? lastFullyLoadedRelationArg
        : -1;

      const relations = Array.isArray(relationTo) ? relationTo : [relationTo];
      const relationsToFetch = lastFullyLoadedRelationToUse === -1
        ? relations
        : relations.slice(lastFullyLoadedRelationToUse + 1);

      let resultsFetched = 0;
      const relationMap = createRelationMap({
        hasMany,
        relationTo,
        value: valueArg,
      });

      if (!errorLoading) {
        relationsToFetch.reduce(async (priorRelation, relation) => {
          let lastLoadedPageToUse;
          if (search !== searchArg) {
            lastLoadedPageToUse = 1;
          } else {
            lastLoadedPageToUse = lastLoadedPage[relation] + 1;
          }
          await priorRelation;

          if (resultsFetched < 10) {
            const collection = collections.find(
              (coll) => coll.slug === relation,
            );
            const fieldToSearch = collection?.admin?.useAsTitle || 'id';

            const query: {
              [key: string]: unknown;
              where: Where;
            } = {
              where: {
                and: [
                  {
                    id: {
                      not_in: relationMap[relation],
                    },
                  },
                ],
              },
              limit: maxResultsPerRequest,
              page: lastLoadedPageToUse,
              sort: fieldToSearch,
              locale,
              depth: 0,
            };

            if (searchArg) {
              query.where.and.push({
                [fieldToSearch]: {
                  like: searchArg,
                },
              });
            }

            if (filterOptionsResult?.[relation]) {
              query.where.and.push(filterOptionsResult[relation]);
            }

            const response = await fetch(
              `${serverURL}${api}/${relation}?${qs.stringify(query)}`,
              {
                credentials: 'include',
                headers: {
                  'Accept-Language': i18n.language,
                },
              },
            );

            if (response.ok) {
              const data: PaginatedDocs<unknown> = await response.json();
              setLastLoadedPage((prevState) => {
                return {
                  ...prevState,
                  [relation]: lastLoadedPageToUse,
                };
              });

              if (!data.nextPage) {
                setLastFullyLoadedRelation(relations.indexOf(relation));
              }

              if (data.docs.length > 0) {
                resultsFetched += data.docs.length;
                dispatchOptions({
                  type: 'ADD',
                  docs: data.docs,
                  collection,
                  sort,
                  i18n,
                  config,
                });
              }
            } else if (response.status === 403) {
              setLastFullyLoadedRelation(relations.indexOf(relation));
              dispatchOptions({
                type: 'ADD',
                docs: [],
                collection,
                sort,
                ids: relationMap[relation],
                i18n,
                config,
              });
            } else {
              setErrorLoading(t('error:unspecific'));
            }
          }
        }, Promise.resolve());

        if (typeof onSuccess === 'function') onSuccess();
      }
    },
    [
      permissions,
      relationTo,
      hasMany,
      errorLoading,
      search,
      lastLoadedPage,
      collections,
      locale,
      filterOptionsResult,
      serverURL,
      api,
      i18n,
      config,
      t,
    ],
  );

  const updateSearch = useDebouncedCallback((searchArg: string, valueArg: Value | Value[]) => {
    getResults({ search: searchArg, value: valueArg, sort: true });
    setSearch(searchArg);
  }, 300);

  const handleInputChange = useCallback((searchArg: string, valueArg: Value | Value[]) => {
    if (search !== searchArg) {
      setLastLoadedPage({});
      updateSearch(searchArg, valueArg);
    }
  }, [search, updateSearch]);

  // ///////////////////////////////////
  // Ensure we have an option for each value
  // ///////////////////////////////////

  useEffect(() => {
    const relationMap = createRelationMap({
      hasMany,
      relationTo,
      value,
    });

    Object.entries(relationMap).reduce(async (priorRelation, [relation, ids]) => {
      await priorRelation;

      const idsToLoad = ids.filter((id) => {
        return !options.find((optionGroup) => optionGroup?.options?.find((option) => option.value === id && option.relationTo === relation));
      });

      if (idsToLoad.length > 0) {
        const query = {
          where: {
            id: {
              in: idsToLoad,
            },
          },
          depth: 0,
          locale,
          limit: idsToLoad.length,
        };

        if (!errorLoading) {
          const response = await fetch(`${serverURL}${api}/${relation}?${qs.stringify(query)}`, {
            credentials: 'include',
            headers: {
              'Accept-Language': i18n.language,
            },
          });

          const collection = collections.find((coll) => coll.slug === relation);
          let docs = [];

          if (response.ok) {
            const data = await response.json();
            docs = data.docs;
          }

          dispatchOptions({
            type: 'ADD',
            docs,
            collection,
            sort: true,
            ids: idsToLoad,
            i18n,
            config,
          });
        }
      }
    }, Promise.resolve());
  }, [
    options,
    value,
    hasMany,
    errorLoading,
    collections,
    hasMultipleRelations,
    serverURL,
    api,
    i18n,
    relationTo,
    locale,
    config,
  ]);

  // Determine if we should switch to word boundary search
  useEffect(() => {
    const relations = Array.isArray(relationTo) ? relationTo : [relationTo];
    const isIdOnly = relations.reduce((idOnly, relation) => {
      const collection = collections.find((coll) => coll.slug === relation);
      const fieldToSearch = collection?.admin?.useAsTitle || 'id';
      return fieldToSearch === 'id' && idOnly;
    }, true);
    setEnableWordBoundarySearch(!isIdOnly);
  }, [relationTo, collections]);

  // When (`relationTo` || `filterOptionsResult` || `locale`) changes, reset component
  // Note - effect should not run on first run
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    dispatchOptions({ type: 'CLEAR' });
    setLastFullyLoadedRelation(-1);
    setLastLoadedPage({});
    setHasLoadedFirstPage(false);
  }, [relationTo, filterOptionsResult, locale]);

  const onSave = useCallback<DocumentDrawerProps['onSave']>((args) => {
    dispatchOptions({ type: 'UPDATE', doc: args.doc, collection: args.collectionConfig, i18n, config });
  }, [i18n, config]);

  const filterOption = useCallback((item: Option, searchFilter: string) => {
    if (!searchFilter) {
      return true;
    }
    const r = wordBoundariesRegex(searchFilter || '');
    // breaking the labels to search into smaller parts increases performance
    const breakApartThreshold = 250;
    let string = item.label;
    // strings less than breakApartThreshold length won't be chunked
    while (string.length > breakApartThreshold) {
      // slicing by the next space after the length of the search input prevents slicing the string up by partial words
      const indexOfSpace = string.indexOf(' ', searchFilter.length);
      if (r.test(string.slice(0, indexOfSpace === -1 ? searchFilter.length : indexOfSpace + 1))) {
        return true;
      }
      string = string.slice(indexOfSpace === -1 ? searchFilter.length : indexOfSpace + 1);
    }
    return r.test(string.slice(-breakApartThreshold));
  }, []);

  const classes = [
    'field-type',
    baseClass,
    className,
    showError && 'error',
    errorLoading && 'error-loading',
    readOnly && `${baseClass}--read-only`,
  ].filter(Boolean).join(' ');

  const valueToRender = findOptionsByValue({ value, options });
  if (!Array.isArray(valueToRender) && valueToRender?.value === 'null') valueToRender.value = null;

  return (
    <div
      id={`field-${(pathOrName).replace(/\./gi, '__')}`}
      className={classes}
      style={{
        ...style,
        width,
      }}
    >
      <Error
        showError={showError}
        message={errorMessage}
      />
      <Label
        htmlFor={pathOrName}
        label={label}
        required={required}
      />
      <GetFilterOptions {...{ filterOptionsResult, setFilterOptionsResult, filterOptions, path: pathOrName, relationTo }} />
      {!errorLoading && (
        <div className={`${baseClass}__wrap`}>
          <ReactSelect
            backspaceRemovesValue={!drawerIsOpen}
            disabled={readOnly || formProcessing}
            onInputChange={(newSearch) => handleInputChange(newSearch, value)}
            onChange={!readOnly ? (selected) => {
              if (selected === null) {
                setValue(hasMany ? [] : null);
              } else if (hasMany) {
                setValue(selected ? selected.map((option) => {
                  if (hasMultipleRelations) {
                    return {
                      relationTo: option.relationTo,
                      value: option.value,
                    };
                  }

                  return option.value;
                }) : null);
              } else if (hasMultipleRelations) {
                setValue({
                  relationTo: selected.relationTo,
                  value: selected.value,
                });
              } else {
                setValue(selected.value);
              }
            } : undefined}
            onMenuScrollToBottom={() => {
              getResults({
                lastFullyLoadedRelation,
                search,
                value: initialValue,
                sort: false,
              });
            }}
            value={valueToRender ?? null}
            showError={showError}
            options={options}
            isMulti={hasMany}
            isSortable={isSortable}
            isLoading={isLoading}
            components={{
              SingleValue,
              MultiValueLabel,
            }}
            customProps={{
              disableMouseDown: drawerIsOpen,
              disableKeyDown: drawerIsOpen,
              setDrawerIsOpen,
              onSave,
            }}
            onMenuOpen={() => {
              if (!hasLoadedFirstPage) {
                setIsLoading(true);
                getResults({
                  value: initialValue,
                  onSuccess: () => {
                    setHasLoadedFirstPage(true);
                    setIsLoading(false);
                  },
                });
              }
            }}
            filterOption={enableWordBoundarySearch ? filterOption : undefined}
          />
          {!readOnly && allowCreate && (
            <AddNewRelation
              {...{ path: pathOrName, hasMany, relationTo, value, setValue, dispatchOptions, options }}
            />
          )}
        </div>
      )}
      {errorLoading && (
        <div className={`${baseClass}__error-loading`}>
          {errorLoading}
        </div>
      )}
      <FieldDescription
        value={value}
        description={description}
      />
    </div>
  );
};

export default withCondition(Relationship);